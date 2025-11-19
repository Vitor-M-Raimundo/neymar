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
$novoEmail = trim($payload['email'] ?? '');

if (!$novoEmail || !filter_var($novoEmail, FILTER_VALIDATE_EMAIL)) {
  echo json_encode(['success' => false, 'message' => 'E-mail inválido']);
  exit;
}

// Gera código de 5 dígitos
try {
  $codigo = str_pad((string)random_int(0, 99999), 5, '0', STR_PAD_LEFT);
} catch (Throwable $e) {
  $codigo = str_pad((string)mt_rand(0, 99999), 5, '0', STR_PAD_LEFT);
}

// Conexão BD
$host = "localhost";
$usuario = "u339248760_proatleta1";
$senhaDb = "Vini@#07alves";
$banco = "u339248760_proatleta";

try {
  $pdo = new PDO("mysql:host=$host;dbname=$banco;charset=utf8", $usuario, $senhaDb, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
  ]);

  // Invalida códigos anteriores ativos para este e-mail
  $pdo->prepare("UPDATE codigos_recuperacao SET status = 0 WHERE email = ? AND status = 1")->execute([$novoEmail]);

  // Cria novo código com expiração (15 min)
  $stmt = $pdo->prepare("INSERT INTO codigos_recuperacao (email, codigo, data_expiracao, status, tentativas) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE), 1, 0)");
  $stmt->execute([$novoEmail, $codigo]);

  // Carrega PHPMailer (tanto se estiver em php/PHPMailer quanto em public_html/PHPMailer)
  $base = __DIR__;
  $paths = [
    $base . '/PHPMailer/PHPMailer.php',
    dirname($base) . '/PHPMailer/PHPMailer.php',
  ];
  $loaded = false;
  foreach ($paths as $p) {
    if (is_file($p)) {
      require_once $p;
      require_once dirname($p) . '/SMTP.php';
      require_once dirname($p) . '/Exception.php';
      $loaded = true;
      break;
    }
  }
  if (!$loaded) { throw new Exception('PHPMailer não encontrado'); }

  $fromEmail = 'contato@proatleta.site';
  $fromName  = 'ProAtleta';

  $mail = new PHPMailer\PHPMailer\PHPMailer(true);
  $mail->CharSet = 'UTF-8';
  $mail->isSMTP();
  $mail->Host       = 'smtp.hostinger.com';
  $mail->SMTPAuth   = true;
  $mail->Username   = $fromEmail;
  $mail->Password   = 'Vini@#07alves';
  $mail->SMTPSecure = 'ssl';
  $mail->Port       = 465;

  $mail->setFrom($fromEmail, $fromName);
  $mail->addAddress($novoEmail);

  // Novo design (similar ao enviar_codigo.php)
  $mail->isHTML(true);
  $mail->Subject = 'Confirmação de alteração de e-mail';
  $safe_codigo = htmlspecialchars($codigo, ENT_QUOTES, 'UTF-8');
  $mail->Body = <<<HTML 
  <div style="font-family: Arial, Helvetica, sans-serif; max-width:600px; margin:0 auto; color:#333;">
    <div style="background:#FF6600; padding:18px 16px; border-radius:8px 8px 0 0; text-align:center; color:#fff;">
        <h2 style="margin:0; font-size:20px;">ProAtleta</h2>
    </div>
    <div
        style="background:#ffffff; padding:20px; border:1px solid #f0f0f0; border-top:none; border-radius:0 0 8px 8px;">
        <p style="margin:0 0 12px 0; font-size:15px;">Olá,</p>
        <p style="margin:0 0 18px 0; font-size:14px; color:#555;">
            Para confirmar a alteração do seu e-mail, utilize o código abaixo:
        </p>
        <p style="margin:0 0 18px 0; text-align:center;">
            <span
                style="display:inline-block; background:#f7f7f7; padding:14px 22px; border-radius:6px; font-size:24px; font-weight:700; letter-spacing:4px; color:#222;">
                {$safe_codigo}
            </span>
        </p>
        <p style="margin:0 0 10px 0; font-size:13px; color:#777;">
            Este código expira em 15 minutos. Se você não solicitou esta alteração, ignore este e-mail.
        </p>
        <hr style="border:none; border-top:1px solid #eee; margin:18px 0;">
        <p style="margin:0; font-size:12px; color:#999;">
            Atenciosamente,<br>
            Equipe ProAtleta
        </p>
    </div>
    </div>
    HTML;

  $mail->AltBody = "Para confirmar a alteração do seu e-mail, use o código: {$codigo}\nVálido por 15 minutos.\nSe você não solicitou esta alteração, ignore este e-mail.";

  $mail->send();

  echo json_encode(['success' => true, 'message' => 'Código enviado']);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['success' => false, 'message' => 'Falha ao enviar código']);
}