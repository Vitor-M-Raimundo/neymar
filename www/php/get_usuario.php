<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

if (!isset($_GET['email']) && !isset($_GET['id'])) {
    echo json_encode(['success' => false, 'message' => 'Email ou ID não informado']);
    exit;
}

$host = "localhost";
$usuario = "u339248760_proatleta1";
$senha = "Vini@#07alves";
$banco = "u339248760_proatleta";

// conexão com o banco
$pdo = new PDO("mysql:host=$host;dbname=$banco;charset=utf8", $usuario, $senha, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
]);

$usuarioDados = null;
$categoria = null;

if (isset($_GET['email'])) {
    $email = $_GET['email'];

    // Ajuste "telefone" para o nome real da coluna, se for diferente
    $stmt = $pdo->prepare("SELECT id, nome, sobrenome, email, foto, telefone FROM aluno WHERE email = ?");
    $stmt->execute([$email]);
    $usuarioDados = $stmt->fetch(PDO::FETCH_ASSOC);
    $categoria = $usuarioDados ? 'aluno' : null;

    if (!$usuarioDados) {
        $stmt = $pdo->prepare("SELECT id, nome, sobrenome, email, foto, telefone FROM professor WHERE email = ?");
        $stmt->execute([$email]);
        $usuarioDados = $stmt->fetch(PDO::FETCH_ASSOC);
        $categoria = $usuarioDados ? 'prof' : null;
    }
} else {
    $id = intval($_GET['id']);

    $stmt = $pdo->prepare("SELECT id, nome, sobrenome, email, foto, telefone FROM aluno WHERE id = ?");
    $stmt->execute([$id]);
    $usuarioDados = $stmt->fetch(PDO::FETCH_ASSOC);
    $categoria = $usuarioDados ? 'aluno' : null;

    if (!$usuarioDados) {
        $stmt = $pdo->prepare("SELECT id, nome, sobrenome, email, foto, telefone FROM professor WHERE id = ?");
        $stmt->execute([$id]);
        $usuarioDados = $stmt->fetch(PDO::FETCH_ASSOC);
        $categoria = $usuarioDados ? 'prof' : null;
    }
}

if ($usuarioDados) {
    // Normaliza a chave de telefone se vier nula (caso não exista na tabela)
    if (!isset($usuarioDados['telefone'])) {
        $usuarioDados['telefone'] = null;
    }
    $usuarioDados['categoria'] = $categoria;
    echo json_encode(['success' => true, 'usuario' => $usuarioDados]);
} else {
    echo json_encode(['success' => false, 'message' => 'Usuário não encontrado']);
}