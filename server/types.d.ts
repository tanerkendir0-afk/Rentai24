declare module "pdfkit" {
  class PDFDocument {
    constructor(options?: any);
    pipe(stream: any): this;
    fontSize(size: number): this;
    font(name: string): this;
    fillColor(color: string): this;
    strokeColor(color: string): this;
    stroke(): this;
    moveTo(x: number, y: number): this;
    lineTo(x: number, y: number): this;
    text(text: string, options?: any): this;
    text(text: string, x: number, y: number, options?: any): this;
    moveDown(lines?: number): this;
    addPage(options?: any): this;
    end(): void;
    on(event: string, callback: (...args: any[]) => void): this;
    y: number;
    page: { height: number; width: number };
  }
  export = PDFDocument;
}

declare module "nodemailer" {
  function createTransport(options: any): any;
  export { createTransport };
}
