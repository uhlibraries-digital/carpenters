import { v4 } from 'uuid';

export class Entry {
  uuid: string;
  timestamp: string;
  type: string;
  message: string;
  notify: boolean;

  constructor(type:string, message: string, notify: boolean = true) {
    this.uuid = v4();
    this.type = type;
    this.message = message;
    this.timestamp = this.getTimestamp();
    this.notify = notify;
  }

  getTimestamp(): string {
    let date = new Date();
    let minutes = ((date.getMinutes() < 10) ? '0' : '') + date.getMinutes();
    let seconds = ((date.getSeconds() < 10) ? '0' : '') + date.getSeconds();

    return (
      date.toLocaleDateString() + ':' +
      date.getHours() + ':' +
      minutes + ':' +
      seconds);
  }
}
