let abcText = `X:1\nT:Sample\nM:4/4\nL:1/4\nK:C\nCDEF GABc|cBAG FEDC|`;

const abcInput = document.getElementById('abcInput');
const notation = document.getElementById('notation');
abcInput.value = abcText;
ABCJS.renderAbc('notation', abcText);

// Render score when edited
const render = () => {
  abcText = abcInput.value;
  ABCJS.renderAbc('notation', abcText);
};

document.getElementById('renderBtn').addEventListener('click', render);

// Play score using abcjs synthesizer
const playBtn = document.getElementById('playBtn');
playBtn.addEventListener('click', () => {
  const visualObj = ABCJS.renderAbc('notation', abcText)[0];
  const synth = new ABCJS.synth.CreateSynth();
  synth
    .init({ visualObj })
    .then(() => synth.prime())
    .then(() => synth.start())
    .catch((err) => console.warn('Playback error', err));
});

// Handle audio file upload (placeholder for transcription)
document.getElementById('audioFile').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  document.getElementById('audioPlayback').src = url;
  // Transcription from audio to score is not implemented; sample score is used.
});

// Microphone recording
let mediaRecorder;
let chunks = [];

const recordBtn = document.getElementById('recordBtn');
const stopBtn = document.getElementById('stopBtn');

recordBtn.addEventListener('click', async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder = new MediaRecorder(stream);
  mediaRecorder.start();
  recordBtn.disabled = true;
  stopBtn.disabled = false;
  mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
  mediaRecorder.onstop = () => {
    const blob = new Blob(chunks, { type: 'audio/webm' });
    chunks = [];
    const url = URL.createObjectURL(blob);
    document.getElementById('audioPlayback').src = url;
  };
});

stopBtn.addEventListener('click', () => {
  if (mediaRecorder) {
    mediaRecorder.stop();
    recordBtn.disabled = false;
    stopBtn.disabled = true;
  }
});
