import { spawn } from 'child_process';

const pythonProcess = spawn('python', ['scripts/test.py'], { stdio: ['pipe', 'pipe', 'inherit'] });

let stdoutData = '';
pythonProcess.stdout.on('data', (data) => {
    stdoutData += data.toString();
});

pythonProcess.on('close', (code) => {
    console.log('Python script exited with code:', code);
    console.log('Python script stdout:', stdoutData);
});
