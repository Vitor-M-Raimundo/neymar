<?php

// Helper para enviar notificações FCM v1 usando service-account JSON.
// Procura automaticamente o arquivo de credenciais fora do public_html.
// Ajuste se necessário o nome do JSON ou caminhos candidatos.

// forçar uso do caminho absoluto encontrado no servidor Hostinger
$SERVICE_ACCOUNT_PATH = '/home/u339248760/domains/proatleta.site/proatletanotificacoes-firebase-adminsdk-fbsvc-9568f2c44f.json';
// log file local
$LOG_FILE = __DIR__ . '/enviar_notificacao_fcm.log';

function logFcm($msg) {
    global $LOG_FILE;
    $line = '[' . date('Y-m-d H:i:s') . '] ' . $msg . PHP_EOL;
    @file_put_contents($LOG_FILE, $line, FILE_APPEND | LOCK_EX);
}

function localizarServiceAccountJson() {
    global $SERVICE_ACCOUNT_PATH;
    if (!empty($SERVICE_ACCOUNT_PATH) && file_exists($SERVICE_ACCOUNT_PATH)) {
        return realpath($SERVICE_ACCOUNT_PATH);
    }

    $patterns = [
        'proatleta*.json',
        '*.firebase-adminsdk*.json',
        '*.json'
    ];

    $nomeExato = 'proatletanotificacoes-firebase-adminsdk-fbsvc-9568f2c44f.json';

    $candidatos = [
        __DIR__ . '/../' . $nomeExato,
        __DIR__ . '/../../' . $nomeExato,
        __DIR__ . '/../../../' . $nomeExato,
        __DIR__ . '/' . $nomeExato,
    ];

    foreach ($candidatos as $c) {
        $real = realpath($c);
        if ($real && is_file($real)) return $real;
    }

    if (!empty($_SERVER['DOCUMENT_ROOT'])) {
        $docRoot = realpath($_SERVER['DOCUMENT_ROOT']);
        if ($docRoot) {
            $parent = dirname($docRoot);
            $tries = [
                $parent . '/' . $nomeExato,
                $parent . '/proatleta*.json'
            ];
            foreach ($tries as $t) {
                $real = realpath($t);
                if ($real && is_file($real)) return $real;
            }
            foreach (glob($parent . '/proatleta*.json') as $f) {
                if (is_file($f)) return realpath($f);
            }
        }
    }

    $base = realpath(__DIR__);
    for ($i = 1; $i <= 5; $i++) {
        $tryDir = dirname($base, $i);
        if (!$tryDir) break;
        foreach ($patterns as $p) {
            foreach (glob($tryDir . '/' . $p) as $f) {
                $bn = basename($f);
                if (stripos($bn, 'proatleta') !== false || stripos($bn, 'firebase') !== false || stripos($bn, 'adminsdk') !== false) {
                    return realpath($f);
                }
            }
        }
    }

    return false;
}

function obterAccessTokenServiceAccount($pathJson) {
    if (!file_exists($pathJson)) throw new Exception("Arquivo de credenciais não encontrado: $pathJson");
    $json = json_decode(file_get_contents($pathJson), true);
    if (!$json) throw new Exception('JSON de credenciais inválido');

    if (empty($json['client_email']) || empty($json['private_key'])) {
        throw new Exception('client_email ou private_key ausentes no JSON de credenciais');
    }

    $header = ['alg' => 'RS256', 'typ' => 'JWT'];
    $now = time();
    $claim = [
        'iss' => $json['client_email'],
        'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
        'aud' => 'https://oauth2.googleapis.com/token',
        'iat' => $now,
        'exp' => $now + 3600
    ];

    $base64url = function($data) {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    };

    $jwtHeader = $base64url(json_encode($header));
    $jwtClaim  = $base64url(json_encode($claim));
    $unsigned = $jwtHeader . '.' . $jwtClaim;

    $privateKey = $json['private_key'];
    $signature = '';
    $ok = openssl_sign($unsigned, $signature, $privateKey, OPENSSL_ALGO_SHA256);
    if (!$ok) throw new Exception('Falha ao assinar JWT com openssl. Verifique se a extensão OpenSSL está habilitada.');

    $jwt = $unsigned . '.' . $base64url($signature);

    $post = http_build_query([
        'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        'assertion' => $jwt
    ]);

    $ch = curl_init('https://oauth2.googleapis.com/token');
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $post);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/x-www-form-urlencoded']);
    $resp = curl_exec($ch);
    if ($resp === false) {
        $err = curl_error($ch);
        curl_close($ch);
        throw new Exception('cURL token erro: ' . $err);
    }
    $http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $data = json_decode($resp, true);
    if ($http !== 200 || !isset($data['access_token'])) {
        throw new Exception('Falha ao obter access_token: HTTP ' . $http . ' - ' . $resp);
    }
    return $data['access_token'];
}

function enviarNotificacaoParaAlvoFCMv1($accessToken, $projectId, $token, $title, $body, $dados = []) {
    $url = "https://fcm.googleapis.com/v1/projects/{$projectId}/messages:send";

    // Monta payload com notification e android.notification (garante exibição no sistema Android)
    $message = [
        'message' => [
            'token' => trim($token),
            'notification' => [
                'title' => $title,
                'body'  => $body,
            ],
            'data' => array_map('strval', $dados),
            'android' => [
                'priority' => 'HIGH',
                'notification' => [
                    'title' => $title,
                    'body'  => $body,
                    'channel_id' => 'default',
                    'sound' => 'default'
                ]
            ]
        ]
    ];

    logFcm("Enviar payload para token: " . substr($token,0,8) . "... payload=" . json_encode($message, JSON_UNESCAPED_UNICODE));

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $accessToken,
        'Content-Type: application/json; charset=utf-8'
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($message, JSON_UNESCAPED_UNICODE));
    $resp = curl_exec($ch);
    if ($resp === false) {
        $err = curl_error($ch);
        curl_close($ch);
        logFcm("cURL erro token " . substr($token,0,8) . "...: " . $err);
        return ['http_code' => 0, 'response' => $err];
    }
    $http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    logFcm("Resposta FCM http={$http} token=" . substr($token,0,8) . "... resp=" . substr($resp,0,800));

    return ['http_code' => $http, 'response' => $resp];
}

function enviarNotificacaoEvento(mysqli $conn, int $usuarioId, string $tipoUsuario, array $evento) {
    $pathCred = localizarServiceAccountJson();
    if (!$pathCred) {
        logFcm("Erro: service-account JSON não encontrado");
        throw new Exception("service-account JSON não encontrado automaticamente. Rode check_path.php para localizar e ajuste o caminho em enviar_notificacao_fcm.php se necessário.");
    }

    $jsonCred = json_decode(file_get_contents($pathCred), true);
    if (!$jsonCred) {
        logFcm("Erro: credenciais JSON inválidas em $pathCred");
        throw new Exception('Credenciais inválidas (service-account.json)');
    }

    $projectId = $jsonCred['project_id'] ?? null;
    if (!$projectId) {
        logFcm("Erro: project_id ausente no JSON de credenciais");
        throw new Exception('project_id ausente no JSON de credenciais');
    }

    $usuarioIdEsc = intval($usuarioId);
    $tipoEsc = $conn->real_escape_string($tipoUsuario);
    $tokens = [];
    $res = $conn->query("SELECT token FROM tokens_dispositivo WHERE usuario_id = $usuarioIdEsc AND tipo_usuario = '$tipoEsc'");
    if ($res) {
        while ($row = $res->fetch_assoc()) {
            $t = trim($row['token']);
            if ($t !== '') $tokens[] = $t;
        }
        $res->free();
    }

    logFcm("enviarNotificacaoEvento usuarioId={$usuarioIdEsc} tipo={$tipoEsc} tokens_count=" . count($tokens));

    if (empty($tokens)) {
        return ['sent' => 0, 'message' => 'Sem tokens'];
    }

    $accessToken = obterAccessTokenServiceAccount($pathCred);

    $title = "Novo evento";
    $dia = isset($evento['data_evento']) ? substr($evento['data_evento'], 8, 2) : '';
    $mes = isset($evento['data_evento']) ? substr($evento['data_evento'], 5, 2) : '';
    $start = $evento['horario_inicio'] ?? '';
    $body = trim(($evento['titulo'] ?? '') . ($dia && $mes ? " em $dia/$mes" : '') . ($start ? " às $start" : ''));

    $dados = [
        'type' => 'novo_evento',
        'evento_id' => strval($evento['evento_id'] ?? ''),
        'titulo' => $evento['titulo'] ?? '',
        'descricao' => $evento['descricao'] ?? '',
        'data_evento' => $evento['data_evento'] ?? '',
        'horario_inicio' => $evento['horario_inicio'] ?? '',
        'horario_fim' => $evento['horario_fim'] ?? '',
        'local' => $evento['local'] ?? ''
    ];

    $sent = 0;
    $results = [];
    foreach ($tokens as $t) {
        $r = enviarNotificacaoParaAlvoFCMv1($accessToken, $projectId, $t, $title, $body, $dados);
        $results[] = $r;

        // interpretar resposta e remover tokens inválidos
        $http = intval($r['http_code']);
        $respText = is_string($r['response']) ? $r['response'] : json_encode($r['response']);
        if ($http === 200) {
            // FCM v1 geralmente devolve JSON com "name" campo em success
            $jsonR = json_decode($respText, true);
            if (is_array($jsonR) && isset($jsonR['error'])) {
                $errMsg = json_encode($jsonR['error']);
                logFcm("FCM returned error for token " . substr($t,0,8) . "...: " . $errMsg);
                // se erro indicar token não registrado — remover
                if (stripos($errMsg, 'NotRegistered') !== false || stripos($errMsg, 'Unregistered') !== false || stripos($errMsg, 'invalid') !== false) {
                    $tokEsc = $conn->real_escape_string($t);
                    $conn->query("DELETE FROM tokens_dispositivo WHERE token = '$tokEsc'");
                    logFcm("Token inválido removido: " . substr($t,0,8) . "...");
                }
            } else {
                $sent++;
            }
        } else {
            // http != 200 -> tentar detectar token inválido na mensagem
            if (stripos($respText, 'NotRegistered') !== false || stripos($respText, 'unregistered') !== false || stripos($respText, 'Invalid') !== false) {
                $tokEsc = $conn->real_escape_string($t);
                $conn->query("DELETE FROM tokens_dispositivo WHERE token = '$tokEsc'");
                logFcm("Token inválido removido (http {$http}): " . substr($t,0,8) . "...");
            }
            logFcm("FCM http !=200 for token " . substr($t,0,8) . "... http={$http} resp=" . substr($respText,0,800));
        }
    }

    logFcm("Envio finalizado sent={$sent} total=" . count($tokens));
    return ['sent' => $sent, 'total' => count($tokens), 'results' => $results];
}