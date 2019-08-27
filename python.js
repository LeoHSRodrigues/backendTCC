PythonShell = require('python-shell');

const gerarCaracteristicas = function () {
    let pyshell = new PythonShell('./python_scripts/gerarCaracteristicas.py');
    
    pyshell.on('message', function (message) {
        console.log(message);
      });
       
      // end the input stream and allow the process to exit
      pyshell.end(function (err,code,signal) {
        if (err) throw err;
        console.log('The exit code was: ' + code);
        console.log('The exit signal was: ' + signal);
      });
      return resultado;
};

const validaCaracteristicas = function () {
    let pyshell = new PythonShell('./python_scripts/comparaCaracteristicas.py');
    pyshell.on('message', function (message) {
        console.log(message);
      });
       
      // end the input stream and allow the process to exit
      pyshell.end(function (err,code,signal) {
        if (err) throw err;
        console.log('The exit code was: ' + code);
        console.log('The exit signal was: ' + signal);
      });
      return resultado;
};

module.exports = {
  gerarCaracteristicas: function() {},
  validaCaracteristicas: function() {}
}