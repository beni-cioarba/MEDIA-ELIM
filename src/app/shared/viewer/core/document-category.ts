import { IconName } from '../../../core/ui/icon-name';
import { DocumentCategory, ViewerDocument, fileNameOf } from './viewer-document.model';

/**
 * Qué sabe hacer el visor con cada familia de fichero. El *shell* no pregunta
 * «¿es un PDF?»: pregunta por capacidades, así añadir una familia nueva es
 * añadir una fila aquí y su motor, sin tocar la barra de herramientas.
 */
export interface CategoryDescriptor {
  readonly icon: IconName;
  /** Color de la insignia de tipo de la cabecera. */
  readonly tone: string;
  /** Clave i18n del nombre del tipo (`doc_viewer.types.*`). */
  readonly labelKey: string;
  readonly zoom: boolean;
  readonly rotate: boolean;
  readonly print: boolean;
  /** Ajuste de línea (motores de texto). */
  readonly wrap: boolean;
}

export const CATEGORIES: Readonly<Record<DocumentCategory, CategoryDescriptor>> = {
  image: { icon: 'image', tone: '#7c3aed', labelKey: 'doc_viewer.types.image', zoom: true, rotate: true, print: true, wrap: false },
  pdf: { icon: 'file-text', tone: '#dc2626', labelKey: 'doc_viewer.types.pdf', zoom: true, rotate: true, print: true, wrap: false },
  video: { icon: 'film', tone: '#0891b2', labelKey: 'doc_viewer.types.video', zoom: false, rotate: false, print: false, wrap: false },
  audio: { icon: 'music', tone: '#0891b2', labelKey: 'doc_viewer.types.audio', zoom: false, rotate: false, print: false, wrap: false },
  text: { icon: 'file-text', tone: '#475569', labelKey: 'doc_viewer.types.text', zoom: false, rotate: false, print: false, wrap: true },
  unsupported: { icon: 'file', tone: '#64748b', labelKey: 'doc_viewer.types.file', zoom: false, rotate: false, print: false, wrap: false },
};

const BY_EXTENSION: Readonly<Record<string, DocumentCategory>> = {
  jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', webp: 'image', avif: 'image', bmp: 'image', svg: 'image',
  pdf: 'pdf',
  mp4: 'video', webm: 'video', ogv: 'video', mov: 'video',
  mp3: 'audio', wav: 'audio', ogg: 'audio', m4a: 'audio', aac: 'audio', flac: 'audio',
  txt: 'text', md: 'text', csv: 'text', json: 'text', xml: 'text', log: 'text',
};

/**
 * Categoría de un documento: la forzada, la de su tipo MIME o la de su
 * extensión, por ese orden. Lo desconocido se ofrece para descargar.
 */
export function resolveCategory(doc: ViewerDocument): DocumentCategory {
  if (doc.category) return doc.category;
  const mime = doc.mimeType?.toLowerCase() ?? '';
  if (mime.startsWith('image/')) return 'image';
  if (mime === 'application/pdf') return 'pdf';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('text/') || mime === 'application/json') return 'text';
  const name = fileNameOf(doc.src);
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1).toLowerCase() : '';
  return BY_EXTENSION[ext] ?? 'unsupported';
}
