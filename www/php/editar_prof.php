<?php

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
header('Content-Type: application/json');

$raw = file_get_contents('php://input');
$payload = json_decode($raw, true);

$emailAtual   = trim($payload['emailAtual']   ?? '');
$novoEmail    = trim($payload['novoEmail']    ?? '');
$telefone     = trim($payload['telefone']     ?? '');
$novaSenha    = $payload['novaSenha'] ?? null;
$codigoEmail  = trim($payload['codigoEmail']  ?? '');
$foto         = trim($payload['foto']         ?? '');

if ($emailAtual === '') { echo json_encode(['success'=>false,'message'=>'Sessão inválida']); exit; }
if ($novoEmail === '' || $telefone === '') { echo json_encode(['success'=>false,'message'=>'Dados incompletos']); exit; }

$host = "localhost";
$usuario = "u339248760_proatleta1";
$senha = "Vini@#07alves";
$banco = "u339248760_proatleta";

try {
  $pdo = new PDO("mysql:host=$host;dbname=$banco;charset=utf8", $usuario, $senha, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
  ]);

  // Ajuste os NOMES das tabelas conforme seu banco
  $tabelaProf = 'professor';
  $tabelaAluno = 'aluno';

  // Se vai trocar o e-mail, verifica se já existe em professor ou aluno
  if ($novoEmail !== $emailAtual) {
    $check = $pdo->prepare("
      SELECT 1 FROM $tabelaProf WHERE email = ? 
      UNION
      SELECT 1 FROM $tabelaAluno WHERE email = ?
      LIMIT 1
    ");
    $check->execute([$novoEmail, $novoEmail]);
    if ($check->fetch()) {
      echo json_encode(['success'=>false,'field'=>'email','message'=>'Não é possível alterar para este e-mail.']);
      exit;
    }

    // (Opcional) validar código de confirmação
    if ($codigoEmail === '' || strlen($codigoEmail) !== 5) {
      echo json_encode(['success'=>false,'message'=>'Código de e-mail inválido.']);
      exit;
    }
    // Aqui você validaria o código realmente (ex: tabela de tokens)
  }

  // Monta UPDATE dinâmico
  $sets = [];
  $params = [];

  if ($novoEmail !== $emailAtual) {
    $sets[] = "email = ?";
    $params[] = $novoEmail;
  }
  if ($telefone !== '') {
    $sets[] = "telefone = ?";
    $params[] = $telefone;
  }
  if ($novaSenha) {
    // Hash da senha
    $hash = password_hash($novaSenha, PASSWORD_DEFAULT);
    $sets[] = "senha = ?";
    $params[] = $hash;
  }
  if ($foto !== '') {
    $sets[] = "foto = ?";
    $params[] = $foto;
  }

  if (empty($sets)) {
    echo json_encode(['success'=>false,'message'=>'Nada para atualizar.']);
    exit;
  }

  $params[] = $emailAtual;

  $sql = "UPDATE $tabelaProf SET ".implode(', ', $sets)." WHERE email = ?";
  $upd = $pdo->prepare($sql);
  $upd->execute($params);

  // Se mudou e-mail, atualiza sessão (frontend já faz isso, mas mandamos de volta)
  echo json_encode([
    'success' => true,
    'novoEmail' => $novoEmail !== $emailAtual ? $novoEmail : $emailAtual,
    'telefone' => $telefone,
    'foto' => $foto
  ]);
} catch (PDOException $e) {
  echo json_encode(['success'=>false,'message'=>'Erro BD','error'=>$e->getMessage()]);
}

?>