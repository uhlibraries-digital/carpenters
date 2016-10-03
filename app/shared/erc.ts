export class Erc {
  who: string;
  what: string;
  when: string;
  where: string;

  constructor(
    who: string = '',
    what: string = '',
    when: string = '',
    where: string = '') {
    this.who = who;
    this.what = what;
    this.when = when;
    this.where = where;
  }

  getQuery(): any {
    return {
      who: this.who,
      what: this.what,
      when: this.when,
      where: this.where
    };
  }

  toTodayISOString(): string {
    let date = new Date();
    return date.getFullYear() +
      '-' + this.padLeft(date.getMonth() + 1, 2, "0") +
      '-' + this.padLeft(date.getDate(), 2, "0");
  }

  private padLeft(value: any, length: number, character: string): string {
    value = String(value);
    return Array(length - value.length + 1).join(character || " ") + value;
  }
}
