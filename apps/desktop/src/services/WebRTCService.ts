import { io, Socket } from 'socket.io-client';

export class WebRTCService {
  private socket: Socket;
  private pc: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;

  constructor(serverUrl: string) {
    this.socket = io(serverUrl);
  }

  async createOffer(sessionId: string) {
    this.pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    this.dataChannel = this.pc.createDataChannel('remote-control');
    this.setupDataChannel();

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('signal', { sessionId, data: { candidate: event.candidate } });
      }
    };

    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    this.socket.emit('signal', { sessionId, data: { offer } });
  }

  async handleSignal(sessionId: string, data: any) {
    if (!this.pc) return;

    if (data.offer) {
      await this.pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      this.socket.emit('signal', { sessionId, data: { answer } });
    } else if (data.answer) {
      await this.pc.setRemoteDescription(new RTCSessionDescription(data.answer));
    } else if (data.candidate) {
      await this.pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
  }

  private setupDataChannel() {
    if (!this.dataChannel) return;

    this.dataChannel.onopen = () => console.log('Data channel opened');
    this.dataChannel.onmessage = (event) => {
      const { type, payload } = JSON.parse(event.data);
      if (type === 'MOUSE_MOVE') {
        (window as any).electronAPI.mouseMove(payload.x, payload.y);
      } else if (type === 'MOUSE_CLICK') {
        (window as any).electronAPI.mouseClick(payload.button);
      } else if (type === 'KEYBOARD_TYPE') {
        (window as any).electronAPI.keyboardType(payload.text);
      }
    };
  }

  sendControlEvent(type: string, payload: any) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(JSON.stringify({ type, payload }));
    }
  }
}
