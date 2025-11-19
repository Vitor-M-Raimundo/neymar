<?php
// Cabeçalhos CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

// Responde a preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Conexão com o banco
$host = "localhost";
$usuario = "u339248760_proatleta1";
$senha = "Vini@#07alves";
$banco = "u339248760_proatleta";

$conn = new mysqli($host, $usuario, $senha, $banco);

if ($conn->connect_error) {
    echo json_encode(['success' => false, 'message' => 'Erro na conexão: ' . $conn->connect_error]);
    exit;
}

// Pega os parâmetros
$treino_id = isset($_POST['treino_id']) ? intval($_POST['treino_id']) : 0;
$professor_id = isset($_POST['professor_id']) ? intval($_POST['professor_id']) : 0;

if ($treino_id <= 0 || $professor_id <= 0) {
    echo json_encode(['success' => false, 'message' => 'Parâmetros inválidos']);
    exit;
}

// Verifica se o treino pertence ao professor
$stmt = $conn->prepare("SELECT id FROM treinos WHERE id = ? AND professor_id = ?");
$stmt->bind_param("ii", $treino_id, $professor_id);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows == 0) {
    echo json_encode(['success' => false, 'message' => 'Treino não encontrado ou você não tem permissão para deletá-lo']);
    exit;
}

// Inicia uma transação
$conn->begin_transaction();

try {
    // Primeiro deleta os exercícios relacionados
    $stmt = $conn->prepare("DELETE FROM exercicios WHERE treino_id = ?");
    $stmt->bind_param("i", $treino_id);
    $stmt->execute();

    // Depois deleta o treino
    $stmt = $conn->prepare("DELETE FROM treinos WHERE id = ? AND professor_id = ?");
    $stmt->bind_param("ii", $treino_id, $professor_id);
    $stmt->execute();

    // Se chegou até aqui, commit na transação
    $conn->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Treino deletado com sucesso'
    ]);

} catch (Exception $e) {
    // Se der erro, faz rollback
    $conn->rollback();
    
    echo json_encode([
        'success' => false,
        'message' => 'Erro ao deletar treino: ' . $e->getMessage()
    ]);
}

$stmt->close();
$conn->close();
?>