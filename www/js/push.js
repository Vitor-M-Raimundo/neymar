// Função de push separada (Android / Firebase)
(function () {
  'use strict';

  function initPush() {
    try {
      if (!window.FirebasePlugin) {
        console.log('FirebasePlugin não disponível.');
        return;
      }
      if (window.device && device.platform && device.platform.toLowerCase() !== 'android') {
        console.log('Ignorando push (não Android).');
        return;
      }

      const usuario_id = parseInt(localStorage.getItem('userId') || '0', 10);
      const rawUserType = String(localStorage.getItem('userType') || '').toLowerCase().trim();
      const tipo_usuario = (rawUserType === 'prof' || rawUserType === 'professor') ? 'professor' : 'aluno';
      if (!usuario_id) {
        console.log('Sem usuario_id para registrar token.');
        return;
      }

      function postarToken(token) {
        console.log('FCM token:', token);
        fetch('https://proatleta.site/registrar_dispositivo.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usuario_id, tipo_usuario, token, plataforma: 'android' })
        })
        .then(res => {
          console.log('registrar_dispositivo status:', res.status);
          return res.text();
        })
        .then(text => {
          try { console.log('registrar_dispositivo resposta:', JSON.parse(text)); }
          catch (e) { console.log('registrar_dispositivo resposta (raw):', text); }
        })
        .catch((e) => console.warn('Erro enviar token:', e));
      }

      window.FirebasePlugin.getToken((token) => {
        postarToken(token);
      }, (err) => console.error('Erro getToken:', err));

      window.FirebasePlugin.onTokenRefresh((token) => {
        console.log('Token atualizado:', token);
        postarToken(token);
      });

      window.FirebasePlugin.onMessageReceived((msg) => {
        try {
          const title = msg.title || msg.notification?.title || 'ProAtleta';
          const body  = msg.body  || msg.notification?.body  || 'Você tem uma atualização';
          const tapped = !!(msg.tap || msg.wasTapped);

          if (typeof app !== 'undefined' && app.notification) {
            const notif = app.notification.create({
              title, text: body, closeButton: true,
              on: { click: () => app?.views?.main?.router?.navigate('/agenda/') }
            });
            notif.open();
          } else if (typeof app !== 'undefined' && app.dialog) {
            app.dialog.alert(body, title, () => app?.views?.main?.router?.navigate('/agenda/'));
          } else {
            alert(`${title}\n\n${body}`);
          }

          if (tapped && app?.views?.main) {
            app.views.main.router.navigate('/agenda/');
          }
        } catch (e) {
          console.error('Erro ao processar push:', e);
        }
      }, (err) => console.error('onMessageReceived erro:', err));
    } catch (e) {
      console.error('initPush erro:', e);
    }
  }

  document.addEventListener('deviceready', initPush, false);
  window.initPush = initPush;
})();