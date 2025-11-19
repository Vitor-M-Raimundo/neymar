<?php
// Cabeçalhos CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
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

// Pega o email do aluno
$email = $_GET['email'] ?? '';

if (empty($email)) {
    echo json_encode(['success' => false, 'message' => 'Email não informado']);
    exit;
}

// Busca informações do aluno
$stmt = $conn->prepare("SELECT id, nome, email, foto FROM aluno WHERE email = ?");
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    $aluno = $result->fetch_assoc();
    
    echo json_encode([
        'success' => true,
        'id' => $aluno['id'],
        'nome' => $aluno['nome'],
        'email' => $aluno['email'],
        'foto' => $aluno['foto'] ?? 'img/user.jpg'
    ]);
} else {
    echo json_encode([
        'success' => false,
        'message' => 'Aluno não encontrado'
    ]);
}

$stmt->close();
$conn->close();
?>