export class ConverterStatus {
  private wasAnyLongLineTruncated_: boolean;
  private label_: string;
  private errors_: string[];

  constructor() {
    this.wasAnyLongLineTruncated_ = false;
    this.label_ = '';
    this.errors_ = [];
  }

  getLabel(): string {
    return this.label_;
  }

  setLabel(label: string): void {
    this.label_ = label;
  }

  markLongLineTruncated(): void {
    this.wasAnyLongLineTruncated_ = true;
  }

  wasAnyLongLineTruncated(): boolean {
    return this.wasAnyLongLineTruncated_;
  }

  addError(error: string): void {
    this.errors_.push(error);
  }

  getErrors(): string[] {
    return this.errors_;
  }
}

