import { useMemo } from 'react';
import qrcode from 'qrcode-generator';

/**
 * QR code gerado no próprio jogo, sem rede (AC-5.9, v11.0.0), com `qrcode-generator` 1.4.4 (MIT, sem dependências).
 * Correção de erro M e margem de 4 módulos, desenhado em SVG com módulos nítidos. `texto` só ASCII (um endereço).
 */
export function QrCode({ texto, largura, rotulo }: { texto: string; largura: number; rotulo: string }) {
  const { d, lado } = useMemo(() => {
    const qr = qrcode(0, 'M');
    qr.addData(texto, 'Byte');
    qr.make();
    const n = qr.getModuleCount();
    let caminho = '';
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) if (qr.isDark(y, x)) caminho += `M${x + 4} ${y + 4}h1v1h-1z`;
    }
    return { d: caminho, lado: n + 8 };
  }, [texto]);
  return (
    <svg
      role="img"
      aria-label={rotulo}
      data-conteudo={texto}
      viewBox={`0 0 ${lado} ${lado}`}
      shapeRendering="crispEdges"
      style={{ display: 'block', flex: 'none', width: `calc(${largura} * var(--u, 1px))`, height: `calc(${largura} * var(--u, 1px))` }}
    >
      <rect width={lado} height={lado} fill="#fff" />
      <path d={d} fill="#0c0b0a" />
    </svg>
  );
}
