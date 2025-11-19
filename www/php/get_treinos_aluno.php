<?php
// Cabeçalhos CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

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
    echo json_encode(["success" => false, "message" => "Falha na conexão: " . $conn->connect_error]);
    exit;
}

// Pega os parâmetros
$email_aluno = $_GET['email_aluno'] ?? '';
$professor_id = isset($_GET['professor_id']) ? intval($_GET['professor_id']) : 0;

if (empty($email_aluno)) {
    echo json_encode(["success" => false, "message" => "Email do aluno não informado"]);
    exit;
}

// Busca o ID do aluno pelo email
$stmt = $conn->prepare("SELECT id, nome, email, foto FROM aluno WHERE email = ?");
$stmt->bind_param("s", $email_aluno);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows == 0) {
    echo json_encode(["success" => false, "message" => "Aluno não encontrado"]);
    exit;
}

$aluno = $result->fetch_assoc();
$aluno_id = $aluno['id'];

// Busca os treinos do aluno
$sql = "SELECT t.*, p.nome as professor_nome, p.email as professor_email 
        FROM treinos t
        INNER JOIN professor p ON t.professor_id = p.id
        WHERE t.aluno_id = ?";

// Se foi passado um professor_id, filtra por ele
if ($professor_id > 0) {
    $sql .= " AND t.professor_id = ?";
}

$sql .= " AND t.ativo = 1 ORDER BY t.data_treino DESC, t.criado_em DESC";

$stmt = $conn->prepare($sql);

if ($professor_id > 0) {
    $stmt->bind_param("ii", $aluno_id, $professor_id);
} else {
    $stmt->bind_param("i", $aluno_id);
}

// Adicionar log para debug
error_log("SQL Query: " . $sql);
error_log("Aluno ID: " . $aluno_id);
error_log("Professor ID: " . $professor_id);

$stmt->execute();
$result = $stmt->get_result();

$treinos = [];
while ($row = $result->fetch_assoc()) {
    // Busca os exercícios de cada treino
    $stmt_ex = $conn->prepare("SELECT * FROM exercicios WHERE treino_id = ? ORDER BY ordem ASC");
    $stmt_ex->bind_param("i", $row['id']);
    $stmt_ex->execute();
    $result_ex = $stmt_ex->get_result();
    
    $exercicios = [];
    while ($ex = $result_ex->fetch_assoc()) {
        $exercicios[] = [
            'id' => $ex['id'],
            'nome' => $ex['nome'],
            'series' => $ex['series'],
            'repeticoes' => $ex['repeticoes'],
            'descanso' => $ex['descanso'],
            'observacoes' => $ex['observacoes'],
            'video_arquivo' => $ex['video_arquivo'],
            'ordem' => $ex['ordem'],
            'concluido' => (bool)$ex['concluido'],
            'concluido_em' => $ex['concluido_em']
        ];
    }
    
    $treinos[] = [
        'id' => $row['id'],
        'nome_treino' => $row['nome_treino'],
        'tipo_treino' => $row['tipo_treino'],
        'data_treino' => $row['data_treino'],
        'observacoes' => $row['observacoes'],
        'professor_nome' => $row['professor_nome'],
        'criado_em' => $row['criado_em'],
        'exercicios' => $exercicios,
        'total_exercicios' => count($exercicios)
    ];
    
    $stmt_ex->close();
}

echo json_encode([
    "success" => true,
    "aluno" => [
        "id" => $aluno['id'],
        "nome" => $aluno['nome'],
        "email" => $aluno['email'],
        "foto" => $aluno['foto']
    ],
    "treinos" => $treinos,
    "total" => count($treinos)
]);

$stmt->close();
$conn->close();
?>