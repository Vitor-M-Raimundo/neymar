<?php

// Salvar evento (aluno) — responde sempre JSON e loga erros em arquivo
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/salvar_evento_error.log');
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit(0);

$host = "localhost";
$usuario = "u339248760_proatleta1";
$senha = "Vini@#07alves";
$banco = "u339248760_proatleta";

$conn = null;

try {
    $raw = file_get_contents('php://input');
    if ($raw === false) throw new Exception('Erro ao ler corpo da requisição');

    $body = json_decode($raw, true);
    if (!is_array($body)) throw new Exception('JSON inválido: ' . substr($raw ?? '', 0, 200));

    $aluno_id = intval($body['aluno_id'] ?? 0);
    $professor_id = intval($body['professor_id'] ?? 0);
    $titulo = trim($body['titulo'] ?? '');
    $descricao = trim($body['descricao'] ?? '');
    $data_evento = trim($body['data_evento'] ?? '');
    $horario_inicio = trim($body['horario_inicio'] ?? '');
    $horario_fim = trim($body['horario_fim'] ?? '');
    // aceitar tanto 'localizacao' (antigo) quanto 'local' (usado no cliente)
    $localizacao = trim($body['localizacao'] ?? $body['local'] ?? '');
    $tipo = trim($body['tipo'] ?? '');

    if ($aluno_id <= 0 || $professor_id <= 0 || $titulo === '' || $data_evento === '') {
        throw new Exception('Parâmetros obrigatórios faltando');
    }

    $conn = new mysqli($host, $usuario, $senha, $banco);
    if ($conn->connect_error) throw new Exception('Erro conexão DB: ' . $conn->connect_error);
    $conn->set_charset('utf8mb4');

    $stmt = $conn->prepare("INSERT INTO agenda_eventos (aluno_id, professor_id, titulo, descricao, data_evento, horario_inicio, horario_fim, localizacao, tipo) VALUES (?,?,?,?,?,?,?,?,?)");
    if (!$stmt) throw new Exception('Falha prepare: ' . $conn->error);

    $stmt->bind_param(
        'iisssssss',
        $aluno_id,
        $professor_id,
        $titulo,
        $descricao,
        $data_evento,
        $horario_inicio,
        $horario_fim,
        $localizacao,
        $tipo
    );

    if (!$stmt->execute()) {
        throw new Exception('Erro executar insert: ' . $stmt->error);
    }

    $evento_id = $stmt->insert_id;
    $stmt->close();

    $eventoDados = [
        'evento_id' => $evento_id,
        'titulo' => $titulo,
        'descricao' => $descricao,
        'data_evento' => $data_evento,
        'horario_inicio' => $horario_inicio,
        'horario_fim' => $horario_fim,
        'local' => $localizacao
    ];

    // Inclui helper de notificação em buffer para evitar saída HTML indesejada
    ob_start();
    $included = @include_once __DIR__ . '/enviar_notificacao_fcm.php';
    ob_end_clean();

    if ($included) {
        try {
            $resEnvio = enviarNotificacaoEvento($conn, $aluno_id, 'aluno', $eventoDados);
            error_log('salvar_evento_aluno notificação result: ' . json_encode($resEnvio));
        } catch (Exception $ePush) {
            error_log('salvar_evento_aluno falha notificação: ' . $ePush->getMessage());
        }
    } else {
        error_log('salvar_evento_aluno: enviar_notificacao_fcm.php não encontrado ou com erro de inclusão.');
    }

    echo json_encode(['success' => true, 'message' => 'Evento salvo com sucesso', 'evento_id' => $evento_id]);
    exit;
} catch (Exception $e) {
    http_response_code(400);
    error_log('salvar_evento_aluno erro: ' . $e->getMessage());
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    exit;
} finally {
    if ($conn instanceof mysqli) $conn->close();
}