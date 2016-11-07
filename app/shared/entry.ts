export class Entry {
  timestamp: string;
  type: string;
  message: string;

  constructor(type:string, message: string) {
    this.type = type;
    this.message = message;
    this.timestamp = this.getTimestamp();
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
