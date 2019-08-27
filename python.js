PythonShell = require('python-shell');

const gerarCaracteristicas = function () {
  var uint8arrayToString = function(data){
    return String.fromCharCode.apply(null, data);
};

  var spawn = require("child_process").spawn;

  var process = spawn('python',["./python_scripts/gerarCaracteristicas.py"]); 
  // console.log(process);

  process.stdout.on('data', (data) => {
    console.log(uint8arrayToString(data));
 });

 // Handle error output
 process.stderr.on('data', (data) => {
  // As said before, convert the Uint8Array to a readable string.
  console.log(uint8arrayToString(data));
});

process.on('exit', (code) => {
  console.log("Process quit with code : " + code);
});
};

const validaCaracteristicas = function () {
  var uint8arrayToString = function(data){
    return String.fromCharCode.apply(null, data);
};

  var spawn = require("child_process").spawn;

  var process = spawn('python',["./python_scripts/comparaCaracteristicas.py"]); 
  // console.log(process);

  process.stdout.on('data', (data) => {
    console.log(uint8arrayToString(data));
 });

 // Handle error output
 process.stderr.on('data', (data) => {
  // As said before, convert the Uint8Array to a readable string.
  console.log(uint8arrayToString(data));
});

process.on('exit', (code) => {
  console.log("Process quit with code : " + code);
});
};

module.exports = {
  gerarCaracteristicas: gerarCaracteristicas,
  validaCaracteristicas:validaCaracteristicas
}