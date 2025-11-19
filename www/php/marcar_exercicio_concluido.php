<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

// Limpar qualquer output anterior
ob_clean();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$host = "localhost";
$usuario = "u339248760_proatleta1";
$senha = "Vini@#07alves";
$banco = "u339248760_proatleta";

// Função para retornar JSON e parar execução
function retornarJson($data) {
    echo json_encode($data);
    exit;
}

$conn = new mysqli($host, $usuario, $senha, $banco);

if ($conn->connect_error) {
    retornarJson(["success" => false, "message" => "Falha na conexão: " . $conn->connect_error]);
}

// Definir charset
$conn->set_charset("utf8");

$input = json_decode(file_get_contents('php://input'), true);

if (json_last_error() !== JSON_ERROR_NONE) {
    retornarJson(["success" => false, "message" => "JSON inválido recebido"]);
}

$exercicio_id = isset($input['exercicio_id']) ? intval($input['exercicio_id']) : 0;
$concluido = isset($input['concluido']) ? intval($input['concluido']) : 0;
$aluno_email = $input['aluno_email'] ?? '';

if (!$exercicio_id || !$aluno_email) {
    retornarJson(["success" => false, "message" => "Parâmetros obrigatórios: exercicio_id e aluno_email"]);
}

// Verificar se o aluno tem permissão para este exercício
$stmt = $conn->prepare("
    SELECT e.id, e.treino_id, t.aluno_id FROM exercicios e
    INNER JOIN treinos t ON e.treino_id = t.id
    INNER JOIN aluno a ON t.aluno_id = a.id
    WHERE e.id = ? AND a.email = ?
");
$stmt->bind_param("is", $exercicio_id, $aluno_email);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    $stmt->close();
    $conn->close();
    retornarJson(["success" => false, "message" => "Exercício não encontrado ou sem permissão"]);
}

$stmt->close();

// Atualizar status do exercício
if ($concluido) {
    $stmt = $conn->prepare("UPDATE exercicios SET concluido = 1, concluido_em = NOW() WHERE id = ?");
} else {
    $stmt = $conn->prepare("UPDATE exercicios SET concluido = 0, concluido_em = NULL WHERE id = ?");
}

$stmt->bind_param("i", $exercicio_id);

if ($stmt->execute()) {
    $concluido_em = null;
    
    if ($concluido) {
        // Buscar o timestamp exato que foi salvo
        $stmt_time = $conn->prepare("SELECT concluido_em FROM exercicios WHERE id = ?");
        $stmt_time->bind_param("i", $exercicio_id);
        $stmt_time->execute();
        $result_time = $stmt_time->get_result();
        if ($row = $result_time->fetch_assoc()) {
            $concluido_em = $row['concluido_em'];
        }
        $stmt_time->close();
    }
    
    retornarJson([
        "success" => true, 
        "message" => $concluido ? "Exercício marcado como concluído!" : "Exercício desmarcado.",
        "concluido" => (bool)$concluido,
        "concluido_em" => $concluido_em,
        "exercicio_id" => $exercicio_id
    ]);
} else {
    retornarJson([
        "success" => false, 
        "message" => "Erro ao atualizar exercício: " . $conn->error
    ]);
}

$stmt->close();
$conn->close();
?>
