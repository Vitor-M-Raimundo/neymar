<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

try {
    $data = json_decode(file_get_contents("php://input"), true);

    $id = $data['ID'] ?? null;

    if (!$id) {
        echo json_encode(["success" => false, "message" => "ID não fornecido"]);
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

    // Prepara e executa o DELETE
    $stmt = $conn->prepare("DELETE FROM solicitacoes_professor WHERE ID = ?");
    if (!$stmt) {
        echo json_encode(["success" => false, "message" => "Erro ao preparar query: " . $conn->error]);
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
