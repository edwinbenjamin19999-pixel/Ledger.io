declare module 'jspdf-autotable' {
  import { jsPDF } from 'jspdf';

  export interface UserOptions {
    head?: any[][];
    body?: any[][];
    foot?: any[][];
    startY?: number;
    theme?: 'striped' | 'grid' | 'plain';
    styles?: any;
    headStyles?: any;
    footStyles?: any;
    bodyStyles?: any;
    [key: string]: any;
  }

  export default function autoTable(doc: jsPDF, options: UserOptions): void;
}