//************************** Define global variables
var machine_loaded = false;
var input_loaded = false;
var transitions;
var new_transitions;
var final_states;
var new_final_states;
var initial_state;
var new_initial_state;
var n_tapes;
var error;
var ncells;
var new_ncells;
var proximaDelta;


if (document.body.offsetWidth > 720) {
  new_ncells = 25;
}
else {
  new_ncells = 17;
}

var total_width = document.body.offsetWidth - 2;
var sq_size;
var total_height;
var trans_speed = 1.0001;
var tapes;
var input;
var state;
var ready_tapes;
var pause = true;
var strkWidth = 4;

var step_counter = 0;
var myCodeMirror;
var machine_name;
var layer;
//***********************END Define global variables

//When loading the page, the stage is created.
window.onload = function () {

  //Start the coding area
  myCodeMirror = CodeMirror.fromTextArea(document.getElementById('code_editor'), {
    mode: "text/html",

    width: "350px",
    lineNumbers: true
  });

  $('.ui.dropdown').dropdown({ action: 'hide' });
  $('.ui.modal').modal();

  //Just a fixed height
  myCodeMirror.setSize(null, 380);

  //Just to set the focus?
  $('#code_container').click();

  //Define main kineticJS stage
  stage = new Kinetic.Stage({
    container: "container",
    width: total_width,
    height: 0
  });

  //Create Layer and add it to stage
  layer = new Kinetic.Layer();
  stage.add(layer);

  //manage speed
  var speed_bar = document.getElementById('speed_bar');
  noUiSlider.create(speed_bar, {
    start: [50],
    step: 1,
    range: { 'min': 0, 'max': 100 },
    connect: "lower",
  });

  speed_bar.noUiSlider.on('slide', function () {
    trans_speed = 2.0001 - 2 * speed_bar.noUiSlider.get() / 100
  });

  //make messages closable
  $('.message .close').on('click', function () {
    $(this).closest('.message').slideUp(500);
  });

  //Load input
  $('#load_input').click(function () {
    $('#accept_icon').removeClass('large green check circle')
      .removeClass('large red remove circle').addClass('write');

    if ((/[\s]/).test($("#input").val())) {

      $('#log_container').slideUp('slow', function () {
        $("#log").html("<strong>Error en el Input</strong>: No se permiten espacios en blanco en el input");
        $("#log_container").slideDown('slow', function () {
        });
      });
    }

    else {
      $('#log_container').slideUp('slow', function () {
      });
      input_loaded = true;
      state = initial_state;
      $('#counter_text').text('');
      stage.remove(layer);
      stage.clear();
      layer.clear();
      loadTapes();
      step_counter = 0;

      $('#estadoActual').text(initial_state);
      $('#counter_text').text("Pasos: 0");
      input = $("#input").val();
      tapes[0].set_input(input);
      enableMachineButtons();
      $('#load_input').addClass('disabled');
      $('#input').addClass('disabled');
      layer.draw();
      pause = true;

      proximaDelta = getCurrentTransition();
      proximaDelta = "<span class='delta'>Siguiente: delta(" + proximaDelta + ") = (" + transitions[proximaDelta] + ")</span>";
      document.getElementById("info_text").innerHTML = proximaDelta;
    }

    document.getElementById("traza").innerHTML = "";
  });

  //Start machine
  $('#play').click(function () {

    if (input_loaded) {
      if (pause) {
        StartMachine(state);
      }
      pause = false;
    }
  });

  //Load input with enter
  $("#input").keyup(function (event) {
    $('#accept_icon').removeClass('large green check circle')
      .removeClass('large red remove circle').addClass('write');
    if (event.keyCode == 13) {
      $("#load_input").click();
    }
  });

  //Pause machine
  $('#pause').click(function () {
    pause = true;
  });

  //Stop machine
  $('#stop').click(function () {
    if (input_loaded) {
      disableMachineButtons();
      input_loaded = false;
      pause = true;
      $('#load_input').removeClass('disabled');
      $('#input').removeClass('disabled');
      state = initial_state;
      stage.remove(layer);
      $('#info_text').text("MT interrumpida - Cargar input en la cinta");
      $('#estadoActual').text(state);
      loadTapes();
    }
  });

  //Step button
  $('#step').click(function () {
    if (input_loaded && pause && ready_tapes == 2 * n_tapes) {
      transicion();
    }
    pause = true;
  });

  //Click on some button when disabled
  $('#machineButtons').mouseup(function (event) {
    if (!input_loaded) {
      $('#log_container').slideUp('slow', function () {
        $("#log").html("You must load an input.");
        $("#log_container").slideDown('slow', function () {
        });
      });
    }
  });


};

//************************** When "load machine" button is clicked.
$('#loader').click(function () {
  if (loadMachine()) {
    $('#log_container').slideUp('slow', function () {
      $('#machine').slideUp('slow', function () {
        $('#load_input').removeClass('disabled');
        $('#input').removeClass('disabled');
        stage.clear();
        layer.removeChildren();
        stage.removeChildren();
        loadStage();
        $("#input").removeClass('disabled');
        $("#load_input").removeClass('disabled');
        disableMachineButtons();
        $('#machine_title').html(machine_name);
        $('#machine').slideDown('slow', function () {
        });
      });
    });

    step_counter = 0;
    $('#info_text').text("Cargar input en la cinta");
    $('#estadoActual').text(initial_state);
    $('#counter_text').text('');
    document.getElementById("traza").innerHTML = "";
  }
});
//*********************** END When "load machine" button is clicked.


//****************** VISUALLY LOAD TAPES
function loadTapes() {
  layer = new Kinetic.Layer();

  //Create n_tapes tapes with their respective read-wrtie heads.
  tapes = new Array();
  var pos_x = total_width / 2;
  var pos_y;

  for (var j = 0; j < n_tapes; j++) {
    tapes[j] = new cinta((8 / 5 * j - 2 / 3) * sq_size + sq_size, ncells, sq_size);
    pos_y = (8 / 5 * j + 4 / 3) * sq_size - sq_size / 6;

    var poly = new Kinetic.RegularPolygon({
      x: pos_x,
      y: pos_y + 2 * sq_size / 5,
      sides: 3,
      radius: sq_size / 3,
      fill: "#000",
      stroke: "#000",
      strokeWidth: strkWidth * 2 / 3
    });

    layer.add(tapes[j].get_square_group());
    layer.add(tapes[j].get_symbol_group());
    layer.add(poly);
  }

  var last_line = new Kinetic.Line({
    points: [0, total_height, total_width, total_height],
    strokeWidth: 2,
    lineJoin: "round",
    stroke: "#000",
    dash: [10, 8]
  });
  var first_line = new Kinetic.Line({
    points: [0, 0, total_width, 0],
    strokeWidth: 2,
    lineJoin: "round",
    stroke: "#000",
    dash: [10, 8]
  });

  layer.add(first_line);
  layer.add(last_line);
  stage.add(layer);
}
//****************** VISUALLY LOAD TAPES

function loadStage() {
  stage.clear();
  sq_size = total_width / (ncells - 2);
  total_height = Math.floor(8 / 5 * sq_size * n_tapes + sq_size / 2);
  stage.setHeight(total_height);
  loadTapes();
}

function StartMachine() {
  transicion();
}

function disableMachineButtons() {
  $("#stop").addClass('disabled');
  $("#pause").addClass('disabled');
  $("#play").addClass('disabled');
  $("#step").addClass('disabled');
}

function enableMachineButtons() {
  $("#stop").removeClass('disabled');
  $("#pause").removeClass('disabled');
  $("#play").removeClass('disabled');
  $("#step").removeClass('disabled');
}


//*********************** Compilation process
//*********************** I'm not very proud of this, but it works ;-)
function loadMachine() {

  machine_name = ''
  var lines = myCodeMirror.getValue().split(/\r\n|\r|\n|\n\r/);
  new_final_states = "qA,qa,qd,qD";
  new_initial_state = "q0";
  var new_ntapes = -1;
  var transitions_defined = false;

  var errmsg;
  var warnings = "Warnings:\n\r";
  new_transitions = new Array();
  var antecedent;
  var consequent;

  var comment_lines = 1;
  error = false;
  for (i = 0; i < lines.length && !error; i += comment_lines + 1) {
    error = false;
    original_line = lines[i].replace(/\s+/g, '');
    if (original_line.indexOf('//') == 0 || original_line.length == 0) {
      comment_lines = 0;
    }
    else {
      line = original_line.toLowerCase();
      if (line.indexOf('init:') == 0) {
        if (line.length <= 5) {
          error = true;
          errmsg = "The <strong>initial state</strong> is not defined";
        }
        else {
          new_initial_state = original_line.split(':')[1];
        }
        comment_lines = 0;
      }

      else if (line.indexOf('accept:') == 0) {
        if (line.length <= 7) {
          error = true;
          errmsg = "There are no <strong>final states</strong> defined";
        }
        else {
          new_final_states = original_line.split(':')[1].split(',');
        }
        comment_lines = 0;
      }

      else if (line.indexOf('mt:') == 0) {
        machine_name = lines[i].split(':')[1].replace(/^\s+|\s+$/g, '');
        comment_lines = 0;
      }

      else {
        if (new_ntapes == -1) {
          new_ntapes = line.split(',').length - 1
          if (new_ntapes < 1) {
            error = true;
            errmsg = "Instrucción incorrecta en línea " + (i + 1) + ": " + line;
          }
        }
        if (!error) {
          if (line.indexOf("//") > 0) {
            line = line.substring(0, line.indexOf("//"));
            original_line = original_line.substring(0, original_line.indexOf("//"));
          }
          transitions_defined = true;
          antecedent = original_line.split(',');
          comment_lines = 1;

          while (lines[i + comment_lines] && (lines[i + comment_lines].indexOf("//") == 0) || lines[i + comment_lines].length == 0) {
            comment_lines++;
          }

          if (lines[i + comment_lines]) {
            consequent_line = lines[i + comment_lines].replace(/\s+/g, '');
            if (consequent_line.indexOf("//") >= 0) {
              consequent_line = consequent_line.substring(0, consequent_line.indexOf("//"));
            }
            consequent = consequent_line.split(',');
          }

          else {
            error = true;
            errmsg = "<br/> La segunda parte de la transición en la línea " + (i + 1) + " no está definida";
          }

          if (!error) {
            if (antecedent.length != new_ntapes + 1) {
              error = true;
              errmsg = "Número incorrecto de elementos en línea " + (i + 1);
            }
            else {
              for (var j = 1; j < new_ntapes + 1 && !error; j++) {
                if (antecedent[j].length != 1) {
                  error = true;
                  errmsg = "Elemento incorrecto en línea " + (i + 1) + ": los símbolos deben ser caracteres individuales";
                  if (antecedent[j].length == 0) {
                    errmsg += "Use B para representar una celda en blanco"
                  }
                }
              }
            }
            if (!error) {
              if (consequent.length != 2 * new_ntapes + 1) {
                error = true;
                errmsg = "Número incorrecto de elementos en línea " + (i + comment_lines + 1);
              }
              else {
                for (var j = 1; j < new_ntapes + 1; j++) {
                  if (consequent[j].length != 1) {
                    error = true;
                    errmsg =
                      "Elemento incorrecto en línea " + (i + comment_lines + 1) + ": los símbolos deben ser caracteres individuales";
                    if (consequent[j].length == 0) {
                      errmsg += "Use B para representar una celda en blanco"
                    }
                  }
                }
                ;
              }
            }
            if (!error) {
              for (var j = 1; j < new_ntapes + 1 && !error; j += 2) {
                if (consequent[j + 1] != 'I' && consequent[j + 1] != 'D' && consequent[j + 1] != 'S') {
                  error = true;
                  errmsg =
                    "Transición incorrecta en la línea " + (i + comment_lines + 1) + ". Los movimientos deben ser D, I o S";
                }
              }
            }
          }
          if (!error) {
            if (new_transitions[original_line]) {
              if (new_transitions[original_line] != lines[i + 1].replace(/\s+/g, '')) {
                error = true;
                errmsg = "Transición en la línea " + (i + 1) + " ya está definida";
              }

              else {
                warnings += "\n\r - Transición en la línea " + (i + 1) + " ya está definida";
              }

            }
            new_transitions[original_line] = lines[i + comment_lines].replace(/\s+/g, '');
          }
          else {
            comment_lines = 0;
          }
        }
      }
    }
  }

  if (!error) {

    if (new_initial_state.length == 0) {
      error = true;
      errmsg = "The initial state is not defined";
    }

    else if (new_final_states.length == 0) {
      error = true;
      errmsg = "No final states defined";
    }

    else if (!transitions_defined) {
      error = true;
      errmsg = "No hay transiciones definidas";
    }

    else {
      final_states = new_final_states;
      initial_state = new_initial_state;
      ncells = new_ncells;
      n_tapes = new_ntapes;
      state = initial_state;
      transitions = new_transitions;
      machine_loaded = true;
      ready_tapes = 2 * n_tapes;
      return true;
    }
  }

  if (error) {
    show_messages('<strong>Error</strong>: ' + errmsg);
    return false;
  }
}
//****************** END OF COMPILATION PROCESS

//Apply 1 transition
function transicion() {

  ready_tapes = 0;

  current_transition = getCurrentTransition();
  var imprimirTraza = true;
  var resultadoAlFinalizar = '';

  //If transition exists, apply transition.
  if (transitions[current_transition]) {
    var aux = transitions[current_transition].split(',');
    state = aux[0];
    $('#estadoActual').text(state);


    for (var i = 0; i / 2 < n_tapes; i += 2) {
      var j = i / 2;
      tapes[j].set_middle_symbol(aux[i + 1]);

      if (aux[i + 2] == 'D') {
        tapes[j].mover(-1, function () {
          transicion();
        });
      }

      else if (aux[i + 2] == 'I') {
        tapes[j].mover(1, function () {
          transicion();
        });
      }

      else {
        tapes[j].mover(0, function () {
          transicion();
        });
      }
    }
    step_counter++;
  }
  //Otherwise verify if the input is accepted.
  else {
    imprimirTraza = false;
    ready_tapes = 2 * n_tapes;

    switch (state) {
      case 'qa':
      case 'qA':
        resultadoAlFinalizar = "Input ACEPTADO";
        $('#accept_icon').removeClass('large red remove circle').addClass('large green check circle').show();
        break;
      case 'qd':
      case 'qD':
        resultadoAlFinalizar = "Cómputo finalizado"
        break;
      case 'qr':
      case 'qR':
        resultadoAlFinalizar = "Input RECHAZADO"
        $('#accept_icon').removeClass('large green check circle').addClass('large red remove circle').show();
        break;
      default:
        resultadoAlFinalizar = "MT Finalizada incorrectamente en el estado: " + state +"</br>La MT sólo debería detenerse en alguno de los siguientes estados: qA, qa, qR, qr, qd, qD"
    }
    document.getElementById("info_text").innerHTML = resultadoAlFinalizar
    //$('#info_text').text(resultadoAlFinalizar);
    layer.draw();
    $('#load_input').removeClass('disabled');
    $('#input').removeClass('disabled');
    disableMachineButtons();
    input_loaded = false;
  }
  $('#counter_text').text("Pasos: " + step_counter);

  if (imprimirTraza) {
    proximaDelta = getCurrentTransition();
    proximaDelta = "<span class='delta'>Siguiente: delta(" + proximaDelta + ") = (" + transitions[proximaDelta] + ")</span>";
    document.getElementById("info_text").innerHTML = proximaDelta;
    agregarMovimientoALaTraza(getDescripcionInstantanea());
  } else {
    agregarMovimientoALaTraza(resultadoAlFinalizar);
  }
}

function agregarMovimientoALaTraza(stLinea) {
  document.getElementById("traza").innerHTML = document.getElementById("traza").innerHTML + "</br>" + stLinea;
}

function getDescripcionInstantanea() {
  var nroLinea = "" + step_counter + ")";
  for (var i = 1; i < 6 - nroLinea.length; i++) nroLinea += " ";
  nroLinea = "<span class='nro'>" + nroLinea + "</span>";
  var resultado = "";
  for (var i = 0; i < n_tapes; i++) {
    var staux = "<span class='estadoMT'>" + state + "</span>"
    resultado += nroLinea + tapes[i].getDescripcionInstantanea().replace('{---estado---}', staux);
    if (i != n_tapes - 1) {
      resultado += "</br>"
    }
  }
  resultado += "    " + proximaDelta + "</br>"
  return resultado;
}

function getCurrentTransition() {
  var current_transition = "";
  current_transition += state + ",";
  for (var i = 0; i < n_tapes - 1; i++) {
    current_transition += tapes[i].get_current_symbol() + ",";
  }
  current_transition += tapes[n_tapes - 1].get_current_symbol();
  return current_transition;
}
