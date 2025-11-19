<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=utf-8");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

date_default_timezone_set('America/Sao_Paulo');
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

$host    = "localhost";
$usuario = "u339248760_proatleta1";
$senha   = "Vini@#07alves";
$banco   = "u339248760_proatleta";

function out($arr, $code = 200) {
  http_response_code($code);
  echo json_encode($arr, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

try {
  if ($_SERVER['REQUEST_METHOD'] !== 'POST') out(['sucesso'=>false,'mensagem'=>'Método inválido'],405);

  $conversa_id  = isset($_POST['conversa_id'])  ? (int)$_POST['conversa_id']  : 0;
  $remetente_id = isset($_POST['remetente_id']) ? (int)$_POST['remetente_id'] : 0;
  $conteudo     = isset($_POST['conteudo'])     ? trim((string)$_POST['conteudo']) : '';
  // 0=professor, 1=aluno
  $rem_flag_in  = $_POST['remetente_professor'] ?? null;
  $rem_flag_in  = ($rem_flag_in === '0' || $rem_flag_in === 0 || $rem_flag_in === 0.0) ? 0 : (($rem_flag_in === '1' || $rem_flag_in === 1 || $rem_flag_in === 1.0) ? 1 : null);

  if ($conversa_id <= 0 || $remetente_id <= 0 || $conteudo === '') out(['sucesso'=>false,'mensagem'=>'Parâmetros inválidos'],400);

  $conn = new mysqli($host, $usuario, $senha, $banco);
  $conn->set_charset('utf8mb4');
  $conn->query("SET time_zone = '-03:00'");

  // Participantes
  $profId = 0; $alunoId = 0;
  $stmt = $conn->prepare("SELECT professor_id, aluno_id FROM conversas WHERE id=? LIMIT 1");
  $stmt->bind_param('i', $conversa_id);
  $stmt->execute();
  $stmt->bind_result($profId, $alunoId);
  if (!$stmt->fetch()) { $stmt->close(); $conn->close(); out(['sucesso'=>false,'mensagem'=>'Conversa inexistente'],404); }
  $stmt->close();

  // Determina flag (0=prof, 1=aluno). Se IDs iguais, a flag é obrigatória.
  if ((int)$profId !== (int)$alunoId) {
    $rem_prof = ($remetente_id === (int)$profId) ? 0 : 1;
  } else {
    if ($rem_flag_in === null) { $conn->close(); out(['sucesso'=>false,'mensagem'=>'remetente_professor obrigatório quando IDs são iguais'],400); }
    $rem_prof = $rem_flag_in;
  }

  // Detecta colunas
  $cols = [];
  $rs = $conn->query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mensagens'");
  while ($r = $rs->fetch_assoc()) $cols[strtolower($r['COLUMN_NAME'])] = true;
  $rs->close();
  $hasRemProf = isset($cols['remetente_professor']);
  $hasRemIs   = isset($cols['remetente_is_professor']); // legado (1=prof)

  // Insere mensagem compatível com colunas presentes
  if ($hasRemProf) {
    $stmt = $conn->prepare("INSERT INTO mensagens (conversa_id, remetente_id, conteudo, criado, remetente_professor) VALUES (?, ?, ?, NOW(), ?)");
    if (!$stmt) { $conn->close(); out(['sucesso'=>false,'mensagem'=>'Erro prepare insert: '.$conn->error],500); }
    $stmt->bind_param('iisi', $conversa_id, $remetente_id, $conteudo, $rem_prof);
  } elseif ($hasRemIs) {
    // coluna legada: remetente_is_professor (1=professor,0=aluno)
    $legacy = ($rem_prof === 0) ? 1 : 0;
    $stmt = $conn->prepare("INSERT INTO mensagens (conversa_id, remetente_id, conteudo, criado, remetente_is_professor) VALUES (?, ?, ?, NOW(), ?)");
    if (!$stmt) { $conn->close(); out(['sucesso'=>false,'mensagem'=>'Erro prepare insert (legacy): '.$conn->error],500); }
    $stmt->bind_param('iisi', $conversa_id, $remetente_id, $conteudo, $legacy);
  } else {
    $stmt = $conn->prepare("INSERT INTO mensagens (conversa_id, remetente_id, conteudo, criado) VALUES (?, ?, ?, NOW())");
    if (!$stmt) { $conn->close(); out(['sucesso'=>false,'mensagem'=>'Erro prepare insert (sem flag): '.$conn->error],500); }
    $stmt->bind_param('iis', $conversa_id, $remetente_id, $conteudo);
  }

  $stmt->execute();
  $msg_id = (int)$conn->insert_id;
  $stmt->close();

  // Timestamp
  $stmt = $conn->prepare("SELECT DATE_FORMAT(criado, '%Y-%m-%d %H:%i:%s') FROM mensagens WHERE id=?");
  $stmt->bind_param('i', $msg_id);
  $stmt->execute();
  $stmt->bind_result($criado);
  $stmt->fetch();
  $stmt->close();

  // Atualiza última atividade (ignora erro se coluna não existir)
  @$conn->query("UPDATE conversas SET ultima_mensagem = NOW() WHERE id = ".(int)$conversa_id);

  // --- INÍCIO: tentativa de notificação push ao destinatário -----------------
  try {
    // determina destinatário: se remetente é professor (rem_prof===0) -> notificar aluno; caso contrário notificar professor
    $recipientId = ($rem_prof === 0) ? (int)$alunoId : (int)$profId;
    $recipientType = ($rem_prof === 0) ? 'aluno' : 'professor';

    // evita notificar quem enviou e casos inválidos
    if ($recipientId > 0 && $recipientId !== (int)$remetente_id) {
      // inclui helper (define localizarServiceAccountJson, obterAccessTokenServiceAccount, enviarNotificacaoParaAlvoFCMv1, etc.)
      @include_once __DIR__ . '/enviar_notificacao_fcm.php';

      if (function_exists('localizarServiceAccountJson') && function_exists('obterAccessTokenServiceAccount') && function_exists('enviarNotificacaoParaAlvoFCMv1')) {
        $pathCred = localizarServiceAccountJson();
        if ($pathCred) {
          try {
            $accessToken = obterAccessTokenServiceAccount($pathCred);
            $jsonCred = json_decode(file_get_contents($pathCred), true);
            $projectId = $jsonCred['project_id'] ?? null;

            if ($accessToken && $projectId) {
              $title = 'Nova mensagem';
              // corpo da notificação: conteúdo truncado (sem HTML) e limpo
              $body = mb_substr(strip_tags($conteudo), 0, 200);
              $data = [
                'type' => 'chat_message',
                'conversa_id' => strval($conversa_id),
                'mensagem_id' => strval($msg_id),
                'from_id' => strval($remetente_id)
              ];

              // buscar tokens do destinatário
              $escType = $conn->real_escape_string($recipientType);
              $qr = $conn->query("SELECT token FROM tokens_dispositivo WHERE usuario_id = ".(int)$recipientId." AND tipo_usuario = '{$escType}'");
              if ($qr) {
                while ($row = $qr->fetch_assoc()) {
                  $tok = trim($row['token'] ?? '');
                  if ($tok !== '') {
                    // envia (cada chamada registra logs em enviar_notificacao_fcm.php)
                    try {
                      enviarNotificacaoParaAlvoFCMv1($accessToken, $projectId, $tok, $title, $body, $data);
                    } catch (Throwable $e) { /* ignora erros de envio individuais */ }
                  }
                }
                $qr->free();
              }
            }
          } catch (Throwable $e) {
            // falha ao obter token de acesso / credenciais -> não bloquear resposta
          }
        }
      }
    }
  } catch (Throwable $e) {
    // não propagar erro de notificação para o cliente
  }
  // --- FIM: notificação push -----------------------------------------------

  $conn->close();
  out(['sucesso'=>true,'id'=>$msg_id,'criado'=>$criado,'remetente_professor'=>$rem_prof]);
} catch (Throwable $e) {
  out(['sucesso'=>false,'mensagem'=>'Erro interno','detalhe'=>$e->getMessage()], 500);
}