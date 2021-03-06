function divElementEnostavniTekst(sporocilo) {
  var jeSmesko = sporocilo.indexOf('http://sandbox.lavbic.net/teaching/OIS/gradivo/') > -1;
  var jeSlika = sporocilo.indexOf('"class="chat-image" />') > -1;
  var jeVideo = sporocilo.indexOf('<iframe src="https://www.youtube.com/embed/') > -1;
  if (jeSmesko || jeSlika || jeVideo) {
    sporocilo = sporocilo.replace(/\</g, '&lt;').replace(/\>/g, '&gt;').replace(/"class="chat-image" \/&gt;/gi, '"class="chat-image" />').replace(/&lt;br&gt;&lt;img src="/gi, '<br><img src="').replace('&lt;img', '<img').replace('png\' /&gt;', 'png\' />').replace(/&lt;iframe src="https:\/\/www.youtube.com\/embed\//gi, '<br><iframe src="https://www.youtube.com/embed/').replace(/" allowfullscreen&gt;&lt;\/iframe&gt;/gi, '" allowfullscreen></iframe>');
    return $('<div style="font-weight: bold"></div>').html(sporocilo);
  } else {
    return $('<div style="font-weight: bold;"></div>').text(sporocilo);
  }
}

function divElementHtmlTekst(sporocilo) {
  return $('<div></div>').html('<i>' + sporocilo + '</i>');
}

function procesirajVnosUporabnika(klepetApp, socket) {
  var sporocilo = $('#poslji-sporocilo').val();
  sporocilo = dodajSmeske(sporocilo);
  
  var zasebno = sporocilo.match(/^\/zasebno.*"$/);
  if(zasebno){
    sporocilo = sporocilo.replace(/\"/gi, '\\"').replace(/\"$/, dodajSlike(sporocilo)+dodajEmbededYoutubePosnetke(sporocilo)+'\\"');
  } else {
    sporocilo += dodajSlike(sporocilo);
    sporocilo += dodajEmbededYoutubePosnetke(sporocilo); 
  }

  var sistemskoSporocilo;

  if (sporocilo.charAt(0) == '/') {
    sistemskoSporocilo = klepetApp.procesirajUkaz(sporocilo);
    if (sistemskoSporocilo) {
      $('#sporocila').append(divElementHtmlTekst(sistemskoSporocilo));
    }
  } else {
    sporocilo = filtirirajVulgarneBesede(sporocilo);
    klepetApp.posljiSporocilo(trenutniKanal, sporocilo);
    $('#sporocila').append(divElementEnostavniTekst(sporocilo));
    $('#sporocila').scrollTop($('#sporocila').prop('scrollHeight'));
  }

  $('#poslji-sporocilo').val('');
}

var socket = io.connect();
var trenutniVzdevek = "", trenutniKanal = "";

var vulgarneBesede = [];
$.get('/swearWords.txt', function(podatki) {
  vulgarneBesede = podatki.split('\r\n');
});

function filtirirajVulgarneBesede(vhod) {
  for (var i in vulgarneBesede) {
    vhod = vhod.replace(new RegExp('\\b' + vulgarneBesede[i] + '\\b', 'gi'), function() {
      var zamenjava = "";
      for (var j=0; j < vulgarneBesede[i].length; j++)
        zamenjava = zamenjava + "*";
      return zamenjava;
    });
  }
  return vhod;
}

$(document).ready(function() {
  var klepetApp = new Klepet(socket);
  
  socket.on('dregljaj', function(dregljaj) {
    $('#vsebina').jrumble();
    $('#vsebina').trigger('startRumble');
    
    setTimeout( function(){
      $('#vsebina').trigger('stopRumble');
    }, 1500 );
    
  });

  socket.on('vzdevekSpremembaOdgovor', function(rezultat) {
    var sporocilo;
    if (rezultat.uspesno) {
      trenutniVzdevek = rezultat.vzdevek;
      $('#kanal').text(trenutniVzdevek + " @ " + trenutniKanal);
      sporocilo = 'Prijavljen si kot ' + rezultat.vzdevek + '.';
    } else {
      sporocilo = rezultat.sporocilo;
    }
    $('#sporocila').append(divElementHtmlTekst(sporocilo));
  });

  socket.on('pridruzitevOdgovor', function(rezultat) {
    trenutniKanal = rezultat.kanal;
    $('#kanal').text(trenutniVzdevek + " @ " + trenutniKanal);
    $('#sporocila').append(divElementHtmlTekst('Sprememba kanala.'));
  });

  socket.on('sporocilo', function (sporocilo) {
    var novElement = divElementEnostavniTekst(sporocilo.besedilo);
    $('#sporocila').append(novElement);
  });
  
  socket.on('kanali', function(kanali) {
    $('#seznam-kanalov').empty();

    for(var kanal in kanali) {
      kanal = kanal.substring(1, kanal.length);
      if (kanal != '') {
        $('#seznam-kanalov').append(divElementEnostavniTekst(kanal));
      }
    }

    $('#seznam-kanalov div').click(function() {
      klepetApp.procesirajUkaz('/pridruzitev ' + $(this).text());
      $('#poslji-sporocilo').focus();
    });
  });

  socket.on('uporabniki', function(uporabniki) {
    $('#seznam-uporabnikov').empty();
    for (var i=0; i < uporabniki.length; i++) {
      $('#seznam-uporabnikov').append(divElementEnostavniTekst(uporabniki[i]));
    }
    
    $('#seznam-uporabnikov div').click(function() {
      $('#poslji-sporocilo').val('/zasebno "' + $(this).text() + '" ');
      $('#poslji-sporocilo').focus();
    });
  });

  setInterval(function() {
    socket.emit('kanali');
    socket.emit('uporabniki', {kanal: trenutniKanal});
  }, 1000);

  $('#poslji-sporocilo').focus();

  $('#poslji-obrazec').submit(function() {
    procesirajVnosUporabnika(klepetApp, socket);
    return false;
  });
  
});

function dodajSmeske(vhodnoBesedilo) {
  var preslikovalnaTabela = {
    ";)": "wink.png",
    ":)": "smiley.png",
    "(y)": "like.png",
    ":*": "kiss.png",
    ":(": "sad.png"
  }
  for (var smesko in preslikovalnaTabela) {
    vhodnoBesedilo = vhodnoBesedilo.replace(smesko,
      "<img src='http://sandbox.lavbic.net/teaching/OIS/gradivo/" +
      preslikovalnaTabela[smesko] + "' />");
  }
  return vhodnoBesedilo;
}


function dodajSlike(besedilo){
  var slike = besedilo.match(/(http:\/\/|https:\/\/)\S+(.jpg|.gif|.png)\b/gi);
  
  var dodaneSlike = "";
  for(var slika in slike){
    dodaneSlike += '<br><img src="' + slike[slika] + '"class="chat-image" />';
  }
  
  return dodaneSlike;
}

function dodajEmbededYoutubePosnetke(besedilo){
  var najdeno = besedilo.match(new RegExp("\\bhttps:\/\/www.youtube.com\/watch\\?v\=.+?(?=\\b)", 'gi'));
  
  var posnetki = "";
  for(var video in najdeno){
    posnetki += " " + (najdeno[video].replace(new RegExp(".*=(.+?(?=\\b))", 'gi'), '<iframe src="https://www.youtube.com/embed/$1" allowfullscreen></iframe>'));
  }
    
  
  return posnetki;
}
