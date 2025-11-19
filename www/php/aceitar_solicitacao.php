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

    // Busca o ID_aluno e ID_professor antes de deletar
    $stmt = $conn->prepare("SELECT ID_aluno, ID_professor FROM solicitacoes_professor WHERE ID = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($row = $result->fetch_assoc()) {
        $idAluno = $row['ID_aluno'];
        $idProfessor = $row['ID_professor'];

        // Insere na tabela aluno_professor
        $stmtInsert = $conn->prepare("INSERT INTO aluno_professor (Aluno_ID, Professor_ID) VALUES (?, ?)");
        $stmtInsert->bind_param("ii", $idAluno, $idProfessor);

        if (!$stmtInsert->execute()) {
            echo json_encode(["success" => false, "message" => "Erro ao inserir vínculo: " . $stmtInsert->error]);
            exit;
        }
        $stmtInsert->close();
    } else {
        echo json_encode(["success" => false, "message" => "Solicitação não encontrada"]);
        exit;
    }
    $stmt->close();

    // Agora deleta da tabela solicitacoes_professor
    $stmtDelete = $conn->prepare("DELETE FROM solicitacoes_professor WHERE ID = ?");
    $stmtDelete->bind_param("i", $id);

    if ($stmtDelete->execute()) {
        echo json_encode(["success" => true, "message" => "Vínculo criado e solicitação removida"]);
    } else {
        echo json_encode(["success" => false, "message" => "Erro ao excluir solicitação: " . $stmtDelete->error]);
    }

    $stmtDelete->close();
    $conn->close();

} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => "Exception: " . $e->getMessage()]);
}
?>
