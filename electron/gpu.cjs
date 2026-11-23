// Match do Saber: aceleração gráfica no app de desktop (performance, 23/11).
// No teste de 18/11 (Ryzen sem placa de vídeo dedicada) o jogo ficou em 15 fps. O Chromium bloqueia alguns drivers
// de vídeo integrado; com o driver bloqueado, o WebGL e a detecção de pose rodam emulados na CPU. O ☰ › Diagnóstico
// mostra onde a detecção está rodando ("aceleração").
const SWITCHES_GPU = ['ignore-gpu-blocklist'];

function aplicarSwitchesGpu(commandLine) {
  for (const s of SWITCHES_GPU) commandLine.appendSwitch(s);
}

module.exports = { aplicarSwitchesGpu, SWITCHES_GPU };
