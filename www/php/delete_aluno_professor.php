<?php

header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

try {
    $data = json_decode(file_get_contents("php://input"), true);

    $aluno_id = $data['Aluno_ID'] ?? null;
    $professor_id = $data['Professor_ID'] ?? null;

    if (!$aluno_id || !$professor_id) {
        echo json_encode(["success" => false, "message" => "Aluno_ID ou Professor_ID não fornecido"]);
        exit;
    }

    // Conexão com o banco
    $servername = "localhost";
    $username = "u339248760_proatleta1";
    $password = "Vini@#07alves";
    $dbname = "u339248760_proatleta";

    $conn = new mysqli($servername, $username, $password, $dbname);

    if ($conn->connect_error) {
        echo json_encode(["success" => false, "message" => "Erro na conexão: " . $conn->connect_error]);
        exit;
    }

    // Busca o ID da associação
    $stmt = $conn->prepare("SELECT ID FROM aluno_professor WHERE Aluno_ID = ? AND Professor_ID = ?");
    if (!$stmt) {
        echo json_encode(["success" => false, "message" => "Erro ao preparar SELECT: " . $conn->error]);
        exit;
    }
    $stmt->bind_param("ii", $aluno_id, $professor_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $assoc = $result->fetch_assoc();
    $stmt->close();

    if (!$assoc) {
        echo json_encode(["success" => false, "message" => "Associação não encontrada"]);
        $conn->close();
        exit;
    }

    $id = $assoc['ID'];

    // Prepara e executa o DELETE
    $stmt = $conn->prepare("DELETE FROM aluno_professor WHERE ID = ?");
    if (!$stmt) {
        echo json_encode(["success" => false, "message" => "Erro ao preparar DELETE: " . $conn->error]);
        $conn->close();
        exit;
    }
    $stmt->bind_param("i", $id);

    if ($stmt->execute()) {
        echo json_encode(["success" => true]);
    } else {
        echo json_encode(["success" => false, "message" => "Erro ao executar DELETE: " . $stmt->error]);
    }

    $stmt->close();
    $conn->close();

} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => "Exception: " . $e->getMessage()]);
}
?>