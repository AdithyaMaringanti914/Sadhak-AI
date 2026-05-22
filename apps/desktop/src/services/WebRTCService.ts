import { io, Socket } from 'socket.io-client';

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export class WebRTCService {
  private socket: Socket;
  private pc: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private remoteStreamCallback: ((stream: MediaStream) => void) | null = null;
  private connectionStateCallback: ((state: RTCPeerConnectionState) => void) | null = null;

  constructor(serverUrl: string) {
    this.socket = io(serverUrl, {
      extraHeaders: { 'ngrok-skip-browser-warning': 'true' },
    });
  }

  getSocket(): Socket {
    return this.socket;
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  /**
   * Register a callback that fires whenever a remote MediaStream track arrives.
   * Call this before createOffer / handleSignal so no tracks are missed.
   */
  onRemoteStream(cb: (stream: MediaStream) => void) {
    this.remoteStreamCallback = cb;
  }

  /**
   * Register a callback for connection state changes (connected, disconnected…)
   */
  onConnectionStateChange(cb: (state: RTCPeerConnectionState) => void) {
    this.connectionStateCallback = cb;
  }

  /**
   * Join the Socket.io signaling room for this session.
   * Must be called by BOTH Helper and Client.
   */
  joinSession(sessionId: string) {
    this.socket.emit('join-session', sessionId);
  }

  /**
   * Add local screen-share tracks to the peer connection.
   * Must be called BEFORE createOffer so tracks are included in the SDP.
   */
  addScreenStream(stream: MediaStream) {
    if (!this.pc) return;
    stream.getTracks().forEach((track) => {
      this.pc!.addTrack(track, stream);
    });
  }

  /**
   * Helper side: create the WebRTC offer.
   * Call this only AFTER the client-joined event confirms the Client is in the room.
   */
  async createOffer(sessionId: string) {
    this.pc = this.buildPeerConnection(sessionId);

    // Create the reliable data channel for remote-control events
    this.dataChannel = this.pc.createDataChannel('remote-control', { ordered: true });
    this.setupDataChannel(this.dataChannel);

    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    this.socket.emit('signal', { sessionId, data: { offer } });
  }

  /**
   * Handle incoming WebRTC signaling data (offer, answer, ICE candidates).
   * Called for both Helper and Client roles.
   */
  async handleSignal(sessionId: string, data: any) {
    // Lazily create the peer connection on the Client side when first signal arrives
    if (!this.pc) {
      this.pc = this.buildPeerConnection(sessionId);

      // If the Client approved before the offer arrived, attach the pending stream now
      const pending = (this as any)._pendingStream as MediaStream | undefined;
      if (pending) {
        pending.getTracks().forEach((track) => this.pc!.addTrack(track, pending));
        delete (this as any)._pendingStream;
      }
    }

    if (data.offer) {
      await this.pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      this.socket.emit('signal', { sessionId, data: { answer } });
    } else if (data.answer) {
      await this.pc.setRemoteDescription(new RTCSessionDescription(data.answer));
    } else if (data.candidate) {
      try {
        await this.pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (e) {
        console.warn('Failed to add ICE candidate', e);
      }
    }
  }

  /**
   * Send a remote-control event through the DataChannel.
   */
  sendControlEvent(type: string, payload: any) {
    if (this.dataChannel?.readyState === 'open') {
      this.dataChannel.send(JSON.stringify({ type, payload }));
    }
  }

  /**
   * Close the peer connection and disconnect the socket.
   */
  destroy() {
    this.pc?.close();
    this.pc = null;
    this.dataChannel = null;
  }

  // ─── Private Helpers ───────────────────────────────────────────────────────

  private buildPeerConnection(sessionId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Forward ICE candidates through the signaling server
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        this.socket.emit('signal', { sessionId, data: { candidate } });
      }
    };

    // Fire the remote-stream callback when the Helper receives tracks from the Client
    pc.ontrack = ({ streams }) => {
      if (streams[0] && this.remoteStreamCallback) {
        this.remoteStreamCallback(streams[0]);
      }
    };

    // Client side: receive the data channel opened by the Helper
    pc.ondatachannel = ({ channel }) => {
      this.dataChannel = channel;
      this.setupDataChannel(channel);
    };

    // Notify App of connection state changes
    pc.onconnectionstatechange = () => {
      console.log('WebRTC state:', pc.connectionState);
      this.connectionStateCallback?.(pc.connectionState);
    };

    return pc;
  }

  private setupDataChannel(channel: RTCDataChannel) {
    channel.onopen = () => console.log('✅ DataChannel open');
    channel.onclose = () => console.log('DataChannel closed');
    channel.onmessage = ({ data }) => {
      try {
        const { type, payload } = JSON.parse(data);
        const api = (window as any).electronAPI;
        if (!api) return;

        if (type === 'MOUSE_MOVE') api.mouseMove(payload.x, payload.y);
        else if (type === 'MOUSE_CLICK') api.mouseClick(payload.button);
        else if (type === 'KEYBOARD_TYPE') api.keyboardType(payload.text);
      } catch (e) {
        console.warn('DataChannel parse error', e);
      }
    };
  }
}
