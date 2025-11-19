<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

error_log("=== DELETAR EVENTO ALUNO - INICIO ===");

try {
    // Conexão
    $host = "localhost";
    $usuario = "u339248760_proatleta1";
    $senha = "Vini@#07alves";
    $banco = "u339248760_proatleta";

    $conn = new mysqli($host, $usuario, $senha, $banco);
    
    if ($conn->connect_error) {
        throw new Exception("Erro conexão: " . $conn->connect_error);
    }
    
    $conn->set_charset("utf8");

    // Verificar método
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Método não permitido');
    }

    // Ler dados JSON
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if ($data === null) {
        throw new Exception('JSON inválido');
    }

    $evento_id = $data['evento_id'] ?? 0;
    $aluno_id = $data['aluno_id'] ?? 0;
    $professor_id = $data['professor_id'] ?? 0;

    // Validações
    if ($evento_id <= 0) throw new Exception('ID do evento obrigatório');
    if ($aluno_id <= 0) throw new Exception('ID do aluno obrigatório');
    if ($professor_id <= 0) throw new Exception('ID do professor obrigatório');

    // Verificar se o evento existe e pertence ao aluno/professor correto
    $sql_check = "SELECT id FROM agenda_eventos WHERE id = ? AND aluno_id = ? AND professor_id = ?";
    $stmt_check = $conn->prepare($sql_check);
    $stmt_check->bind_param("iii", $evento_id, $aluno_id, $professor_id);
    $stmt_check->execute();
    $result = $stmt_check->get_result();

    if ($result->num_rows === 0) {
        throw new Exception('Evento não encontrado ou sem permissão para deletar');
    }

    // Deletar o evento
    $sql_delete = "DELETE FROM agenda_eventos WHERE id = ? AND aluno_id = ? AND professor_id = ?";
    $stmt_delete = $conn->prepare($sql_delete);
    $stmt_delete->bind_param("iii", $evento_id, $aluno_id, $professor_id);

    if ($stmt_delete->execute()) {
        echo json_encode([
            'success' => true,
            'message' => 'Evento deletado com sucesso!'
        ]);
    } else {
        throw new Exception("Erro ao deletar evento: " . $conn->error);
    }

} catch (Exception $e) {
    error_log("ERRO ao deletar evento: " . $e->getMessage());
    
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

$conn->close();
error_log("=== DELETAR EVENTO ALUNO - FIM ===");
?>