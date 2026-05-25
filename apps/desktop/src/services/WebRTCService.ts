import { io, Socket } from 'socket.io-client';

const ICE_SERVERS: RTCIceServer[] = [
];

export class WebRTCService {
  private socket: Socket;
  private pc: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private remoteStreamCallback: ((stream: MediaStream) => void) | null = null;
  private connectionStateCallback: ((state: RTCPeerConnectionState) => void) | null = null;
  private offerCreatedForSessionId: string | null = null;

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
    console.log('[DEBUG] Client: adding screen stream to peer connection');
    console.log('[DEBUG] Client: stream id =', stream.id);
    stream.getTracks().forEach((track) => {
      console.log('[DEBUG] Client: adding track type', track.kind, 'id', track.id, 'enabled', track.enabled);
      this.pc!.addTrack(track, stream);
    });
  }

  /**
   * Helper side: create the WebRTC offer.
   * Call this only AFTER the client-joined event confirms the Client is in the room.
   */
  async createOffer(sessionId: string) {
    if (this.offerCreatedForSessionId === sessionId) {
      console.log('[DEBUG] Offer already created for session. Skipping.');
      return;
    }
    if (this.pc && this.pc.signalingState !== 'closed') {
      console.log('[DEBUG] Peer connection already exists. Skipping offer creation.');
      this.offerCreatedForSessionId = sessionId;
      return;
    }
    this.offerCreatedForSessionId = sessionId;
    console.log('[DEBUG] Helper creating WebRTC offer');
    this.pc = this.buildPeerConnection(sessionId);

    // The helper only receives the client's desktop stream, so advertise
    // recvonly media up front before creating the offer.
    this.pc.addTransceiver('video', { direction: 'recvonly' });
    this.pc.addTransceiver('audio', { direction: 'recvonly' });
    console.log('[DEBUG] Added recvonly transceivers for video/audio');

    // Create the reliable data channel for remote-control events
    this.dataChannel = this.pc.createDataChannel('remote-control', { ordered: true });
    this.setupDataChannel(this.dataChannel);

    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    console.log('[DEBUG] Sending offer to client');
    this.socket.emit('signal', { sessionId, data: { offer } });
  }

  /**
   * Handle incoming WebRTC signaling data (offer, answer, ICE candidates).
   * Called for both Helper and Client roles.
   */
  async handleSignal(sessionId: string, data: any) {
    console.log(`[DEBUG CLIENT/SERVER] handleSignal called, data keys: ${Object.keys(data).join(', ')}`);

    // Lazily create the peer connection on the Client side when first signal arrives
    if (!this.pc) {
      console.log('[DEBUG CLIENT] Creating peer connection for the first time');
      this.pc = this.buildPeerConnection(sessionId);

      // If the Client approved before the offer arrived, attach the pending stream now
      const pending = (this as any)._pendingStream as MediaStream | undefined;
      if (pending) {
        console.log('[DEBUG CLIENT] Found pending screen-share stream to attach');
        this.addScreenStream(pending);
        console.log('[DEBUG CLIENT] Finished adding screen tracks');
        delete (this as any)._pendingStream;
      } else {
        console.log('[DEBUG CLIENT] NO pending stream — this is bad (client never captured screen share?)');
      }
    } else {
      console.log('[DEBUG CLIENT] Peer connection already exists');
    }

    if (data.offer) {
      console.log('[DEBUG CLIENT] Received WebRTC offer from helper');
      console.log('[DEBUG CLIENT] Offer SDP (first 400 chars):', data.offer.sdp?.substring(0, 400));

      console.log('[DEBUG CLIENT] Setting remote description…');
      await this.pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      console.log('[DEBUG CLIENT] Set remote description OK');

      console.log('[DEBUG CLIENT] Client senders BEFORE createAnswer:', this.pc.getSenders().length);
      this.pc.getSenders().forEach((sender, idx) => {
        console.log(`[DEBUG CLIENT] sender ${idx} before answer:`, sender.track?.kind, 'enabled?', sender.track?.enabled);
      });

      console.log('[DEBUG CLIENT] Creating answer…');
      const answer = await this.pc.createAnswer();
      console.log('[DEBUG CLIENT] Answer created');
      console.log('[DEBUG CLIENT] Answer SDP (first 400 chars):', answer.sdp?.substring(0, 400));

      console.log('[DEBUG CLIENT] Setting local description…');
      await this.pc.setLocalDescription(answer);
      console.log('[DEBUG CLIENT] Set local description OK');

      console.log('[DEBUG CLIENT] Client senders AFTER setLocalDescription:', this.pc.getSenders().length);
      this.pc.getSenders().forEach((sender, idx) => {
        console.log(`[DEBUG CLIENT] sender ${idx} after answer:`, sender.track?.kind, 'id', sender.track?.id, 'enabled?', sender.track?.enabled);
      });

      console.log('[DEBUG CLIENT] Sending answer to helper via socket');
      this.socket.emit('signal', { sessionId, data: { answer } });
    } else if (data.answer) {
      console.log('[DEBUG HELPER] Received answer from client');
      console.log('[DEBUG HELPER] Answer SDP (first 400 chars):', data.answer.sdp?.substring(0, 400));
      await this.pc.setRemoteDescription(new RTCSessionDescription(data.answer));

      console.log('[DEBUG HELPER] Set remote description');
      console.log('[DEBUG HELPER] Helper receivers count:', this.pc.getReceivers().length);
      this.pc.getReceivers().forEach((receiver, idx) => {
        console.log(`[DEBUG HELPER] receiver ${idx}:`, receiver.track?.kind, receiver.track?.id);
      });
    } else if (data.candidate) {
      console.log('[DEBUG ICE] Adding ICE candidate', data.candidate);
      try {
        await this.pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (e) {
        console.warn('[DEBUG ICE] Failed to add ICE candidate', e);
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
    this.offerCreatedForSessionId = null;
  }

  // ─── Private Helpers ───────────────────────────────────────────────────────

  private buildPeerConnection(sessionId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
      iceTransportPolicy: 'all',
      sdpSemantics: 'unified-plan',
      iceCandidatePoolSize: 0,
    });

    console.log('[DEBUG] buildPeerConnection: created new RTCPeerConnection (NO STUN, same-machine only)');

    // Forward ICE candidates through the signaling server
    pc.onicecandidate = ({ candidate }) => {
      console.log('[DEBUG] onicecandidate:', candidate ? candidate.candidate : '(null)');
      if (candidate) {
        this.socket.emit('signal', { sessionId, data: { candidate } });
      }
    };

    // Fire the remote-stream callback when the Helper receives tracks from the Client
    pc.ontrack = (event) => {
      console.log('[DEBUG] ontrack: track kind =', event.track.kind, 'id =', event.track.id);
      console.log('[DEBUG] ontrack: streams.length =', event.streams.length);
      
      let stream = event.streams[0];
      
      if (!stream) {
        console.log('[DEBUG] ontrack: no stream attached to track, creating new one');
        stream = new MediaStream();
        stream.addTrack(event.track);
      }
      
      console.log('[DEBUG] Helper received remote video track, streaming:', stream.id);
      if (this.remoteStreamCallback) {
        this.remoteStreamCallback(stream);
      }
    };

    // Client side: receive the data channel opened by the Helper
    pc.ondatachannel = ({ channel }) => {
      console.log('[DEBUG] ondatachannel: channel label =', channel.label);
      this.dataChannel = channel;
      this.setupDataChannel(channel);
    };

    // Notify App of connection state changes
    pc.onconnectionstatechange = () => {
      console.log('[DEBUG] onconnectionstatechange:', pc.connectionState);
      this.connectionStateCallback?.(pc.connectionState);
    };

    pc.onsignalingstatechange = () => {
      console.log('[DEBUG] onsignalingstatechange:', pc.signalingState);
    };

    pc.onicegatheringstatechange = () => {
      console.log('[DEBUG] onicegatheringstatechange:', pc.iceGatheringState);
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[DEBUG] oniceconnectionstatechange:', pc.iceConnectionState);
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
