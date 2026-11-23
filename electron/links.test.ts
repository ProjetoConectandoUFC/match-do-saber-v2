import { describe, expect, it } from 'vitest';
import { linkExterno } from './links.cjs';

// AC-16.2/FR-17: as fontes abrem no navegador do sistema, nunca na janela do jogo; só http e https.
describe('linkExterno', () => {
  it('aceita http e https', () => {
    expect(linkExterno('https://aosfatos.org/noticias/x')).toBe(true);
    expect(linkExterno('http://exemplo.org')).toBe(true);
    expect(linkExterno('HTTPS://EXEMPLO.ORG/A')).toBe(true);
  });

  it('recusa outros esquemas, texto sem esquema e valores que não são texto', () => {
    for (const u of ['file:///C:/Windows/system32/calc.exe', 'javascript:alert(1)', 'ms-settings:', 'mailto:a@b.org',
      'exemplo.org', '', 'https://', undefined, null, 42]) {
      expect(linkExterno(u)).toBe(false);
    }
  });
});
