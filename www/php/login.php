<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=utf-8");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

// Lê do corpo JSON ou formulário
$raw  = file_get_contents('php://input');
$body = json_decode($raw, true);
if (is_array($body) && isset($body['email'], $body['senha'])) {
    $email = trim((string)$body['email']);
    $senha = (string)$body['senha'];
} else {
    $email = isset($_POST['email']) ? trim((string)$_POST['email']) : '';
    $senha = isset($_POST['senha']) ? (string)$_POST['senha'] : '';
}
if ($email === '' || $senha === '') { echo json_encode(['success'=>false,'message'=>'Informe email e senha.']); exit; }

mysqli_report(MYSQLI_REPORT_OFF);
$conn = new mysqli("localhost","u339248760_proatleta1","Vini@#07alves","u339248760_proatleta");
if ($conn->connect_error) { echo json_encode(['success'=>false,'message'=>'Erro de conexão.']); exit; }
$conn->set_charset('utf8mb4');

function buscaUsuario(mysqli $conn, string $email, string $tabela) {
    $stmt = $conn->prepare("SELECT id, nome, email, senha, verificado FROM {$tabela} WHERE email = ? LIMIT 1");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $r = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$r) return null;
    $r['tabela']    = $tabela;      // 'aluno' ou 'professor'
    $r['categoria'] = $tabela;      // mesmo valor para uso interno
    return $r;
}

// Procura primeiro em professor, depois em aluno
$usuario = buscaUsuario($conn, $email, 'professor');
if (!$usuario) $usuario = buscaUsuario($conn, $email, 'aluno');
if (!$usuario) { echo json_encode(['success'=>false,'message'=>'Email ou senha inválidos.']); $conn->close(); exit; }

$id         = (int)$usuario['id'];
$nome       = (string)$usuario['nome'];
$hash       = (string)$usuario['senha'];   // não faça trim no hash
$verificado = (int)$usuario['verificado'];
$tabela     = (string)$usuario['tabela'];

$ok = false;
$pareceHash = preg_match('/^\$(2y|2a|argon2i|argon2id)\$/', $hash) === 1;

// Log mínimo de depuração (não registra senha)
error_log("LOGIN DEBUG: email={$email} tabela={$tabela} lenHash=".strlen($hash)." prefix=".substr($hash,0,4));

if ($pareceHash) {
    $ok = password_verify($senha, $hash);
    error_log("LOGIN DEBUG: password_verify=" . ($ok ? 'true' : 'false'));
} else {
    // Migração de legado (senha em texto puro)
    if ($hash !== '' && hash_equals($hash, $senha)) {
        $ok = true;
        $novoHash = password_hash($senha, PASSWORD_DEFAULT);
        // whitelist explícita da tabela
        $tabOk = ($tabela === 'aluno' || $tabela === 'professor') ? $tabela : '';
        if ($tabOk !== '') {
            $upd = $conn->prepare("UPDATE {$tabOk} SET senha=? WHERE id=?");
            $upd->bind_param("si", $novoHash, $id);
            $upd->execute();
            $upd->close();
            $hash = $novoHash;
            error_log("LOGIN DEBUG: migrou senha legacy para hash");
        }
    }
}

if (!$ok) { echo json_encode(['success'=>false,'message'=>'Email ou senha inválidos.']); $conn->close(); exit; }
if ($verificado !== 1) { echo json_encode(['success'=>false,'message'=>'Email ainda não verificado.']); $conn->close(); exit; }

// Rehash se política mudou (ex.: custo)
if ($pareceHash && password_needs_rehash($hash, PASSWORD_DEFAULT)) {
    $novoHash = password_hash($senha, PASSWORD_DEFAULT);
    $tabOk = ($tabela === 'aluno' || $tabela === 'professor') ? $tabela : '';
    if ($tabOk !== '') {
        $upd = $conn->prepare("UPDATE {$tabOk} SET senha=? WHERE id=?");
        $upd->bind_param("si", $novoHash, $id);
        $upd->execute();
        $upd->close();
        error_log("LOGIN DEBUG: rehash executado");
    }
}

// Normaliza para o front: 'prof' ou 'aluno'
$categoria = ($tabela === 'professor') ? 'prof' : 'aluno';

echo json_encode([
    'success'   => true,
    'id'        => $id,
    'nome'      => $nome,
    'categoria' => $categoria
]);

$conn->close();
?>