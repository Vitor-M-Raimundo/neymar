<?php

// CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

header('Content-Type: application/json');

// Lê JSON
$raw = file_get_contents('php://input');
$payload = json_decode($raw, true);

$emailAtual  = trim($payload['emailAtual']  ?? '');
$novoEmail   = trim($payload['novoEmail']   ?? '');
$telefone    = trim($payload['telefone']    ?? '');
$novaSenha   = $payload['novaSenha'] ?? null;
$codigoEmail = trim($payload['codigoEmail'] ?? ''); // código para confirmar troca de e-mail
$foto        = trim($payload['foto']        ?? '');

if ($emailAtual === '') {
  echo json_encode(['success' => false, 'message' => 'emailAtual ausente']);
  exit;
}
if ($novoEmail === '' && $telefone === '' && ($novaSenha === null || $novaSenha === '') && $foto === '') {
  echo json_encode(['success' => false, 'message' => 'Nenhum campo para atualizar']);
  exit;
}

// Normaliza telefone (mantém apenas dígitos)
if ($telefone !== '') {
  $telefone = preg_replace('/\D+/', '', $telefone);
}

// Regras de senha (se enviada precisa passar)
if ($novaSenha !== null && $novaSenha !== '') {
  if (strlen($novaSenha) < 6) {
    echo json_encode(['success' => false, 'message' => 'A senha deve ter no mínimo 6 caracteres.']);
    exit;
  }
  if (!preg_match('/[A-Z]/', $novaSenha) || !preg_match('/\d/', $novaSenha)) {
    echo json_encode(['success' => false, 'message' => 'A senha deve conter pelo menos 1 letra maiúscula e 1 número.']);
    exit;
  }
}

$host = "localhost";
$usuario = "u339248760_proatleta1";
$senhaDb = "Vini@#07alves";
$banco = "u339248760_proatleta";

try {
  $pdo = new PDO("mysql:host=$host;dbname=$banco;charset=utf8", $usuario, $senhaDb, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
  ]);

  // Verifica existência do aluno
  $stmt = $pdo->prepare("SELECT id, email FROM aluno WHERE email = ? LIMIT 1");
  $stmt->execute([$emailAtual]);
  $aluno = $stmt->fetch(PDO::FETCH_ASSOC);
  if (!$aluno) {
    echo json_encode(['success' => false, 'message' => 'Aluno não encontrado']);
    exit;
  }

  // Monta SET dinâmico
  $sets = [];
  $params = [];

  // Troca de e-mail: valida formato, duplicidade em aluno e professor e código
  if ($novoEmail !== '' && $novoEmail !== $emailAtual) {
    if (!filter_var($novoEmail, FILTER_VALIDATE_EMAIL)) {
      echo json_encode(['success' => false, 'message' => 'Novo e-mail inválido']);
      exit;
    }

    // Checa duplicidade em aluno
    $chkAluno = $pdo->prepare("SELECT id FROM aluno WHERE email = ? LIMIT 1");
    $chkAluno->execute([$novoEmail]);
    if ($chkAluno->fetch(PDO::FETCH_ASSOC)) {
      echo json_encode(['success' => false, 'field' => 'email', 'message' => 'Não é possível alterar para este e-mail.']);
      exit;
    }

    // Checa duplicidade em professor (bloqueia se já existir lá também)
    $chkProf = $pdo->prepare("SELECT id FROM professor WHERE email = ? LIMIT 1");
    $chkProf->execute([$novoEmail]);
    if ($chkProf->fetch(PDO::FETCH_ASSOC)) {
      echo json_encode(['success' => false, 'field' => 'email', 'message' => 'Não é possível alterar para este e-mail.']);
      exit;
    }

    // Código obrigatório para troca de e-mail
    if ($codigoEmail === '') {
      echo json_encode(['success' => false, 'message' => 'Código de verificação obrigatório']);
      exit;
    }

    // Valida código na tabela codigos_recuperacao (associado ao novo e-mail)
    $codStmt = $pdo->prepare("SELECT id, codigo, status, data_expiracao, tentativas FROM codigos_recuperacao WHERE email = ? AND status = 1 ORDER BY data_criacao DESC LIMIT 1");
    $codStmt->execute([$novoEmail]);
    $rec = $codStmt->fetch(PDO::FETCH_ASSOC);

    if (!$rec) {
      echo json_encode(['success' => false, 'message' => 'Código não encontrado ou já utilizado.']);
      exit;
    }

    // Expiração
    if (!empty($rec['data_expiracao']) && strtotime($rec['data_expiracao']) < time()) {
      $pdo->prepare("UPDATE codigos_recuperacao SET status = 0 WHERE id = ?")->execute([$rec['id']]);
      echo json_encode(['success' => false, 'message' => 'Código expirado.']);
      exit;
    }

    // Confere código (limite de tentativas = 5)
    if ($rec['codigo'] !== $codigoEmail) {
      $tent = (int)$rec['tentativas'] + 1;
      if ($tent >= 5) {
        $pdo->prepare("UPDATE codigos_recuperacao SET tentativas = ?, status = 0 WHERE id = ?")->execute([$tent, $rec['id']]);
      } else {
        $pdo->prepare("UPDATE codigos_recuperacao SET tentativas = ? WHERE id = ?")->execute([$tent, $rec['id']]);
      }
      echo json_encode(['success' => false, 'message' => 'Código inválido.']);
      exit;
    }

    // Marca código como usado
    $pdo->prepare("UPDATE codigos_recuperacao SET status = 0 WHERE id = ?")->execute([$rec['id']]);

    // Prossegue com troca de e-mail
    $sets[] = "email = ?";
    $params[] = $novoEmail;
  }

  if ($telefone !== '') {
    $sets[] = "telefone = ?";
    $params[] = $telefone; // apenas dígitos
  }

  if ($novaSenha !== null && $novaSenha !== '') {
    $hash = password_hash($novaSenha, PASSWORD_DEFAULT);
    $sets[] = "senha = ?";
    $params[] = $hash;
  }

  if ($foto !== '') {
    $sets[] = "foto = ?";
    $params[] = $foto;
  }

  if (empty($sets)) {
    echo json_encode(['success' => true, 'message' => 'Nada para atualizar']);
    exit;
  }

  $params[] = $aluno['id'];
  $sql = "UPDATE aluno SET " . implode(', ', $sets) . " WHERE id = ?";
  $upd = $pdo->prepare($sql);
  $upd->execute($params);

  echo json_encode([
    'success' => true,
    'updated' => [
      'email'         => $novoEmail !== '' ? $novoEmail : $aluno['email'],
      'telefone'      => $telefone,
      'senhaAlterada' => ($novaSenha !== null && $novaSenha !== ''),
      'foto'          => $foto
    ]
  ]);
} catch (PDOException $e) {
  http_response_code(500);
  echo json_encode(['success' => false, 'message' => 'Erro no servidor']);
}
?>