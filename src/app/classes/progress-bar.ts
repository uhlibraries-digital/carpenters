import { v1 } from 'uuid';

export class ProgressBar {
  id: string;
  value: number;
  max: number;
  description: string;

  constructor(max: number, description?: string) {
    this.id = v1();
    this.value = 0;
    this.max = max;
    this.description = description;
  }

}
