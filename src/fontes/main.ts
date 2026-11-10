// Página das fontes (AC-5.10, v11.0.0): entrada própria do Vite (fontes.html), sem React e sem service worker.
import '@fontsource/poppins/latin-500.css';
import '@fontsource/poppins/latin-600.css';
import '@fontsource/poppins/latin-700.css';
import '@fontsource/poppins/latin-800.css';
import '../app/tema.css';
import { carregarPagina } from './pagina';
import s from './fontes.module.css';

const topo = document.getElementById('topo')!;
topo.className = s.topo ?? '';
document.getElementById('conteudo')!.className = s.conteudo ?? '';
document.getElementById('rodape')!.className = s.rodape ?? '';

const ler = async (url: string) => {
  const r = await fetch(url, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.text();
};
const atualizar = () => carregarPagina(document.getElementById('conteudo')!, window.location.hash, ler, import.meta.env.BASE_URL);
window.addEventListener('hashchange', atualizar);
void atualizar();
