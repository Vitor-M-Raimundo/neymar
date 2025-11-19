<?php
header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', 1);
header("Access-Control-Allow-Origin: *");

// LOG DE DEPURAÇÃO - Ver o que está chegando no PHP
error_log("=== DADOS RECEBIDOS NO PHP ===");
error_log("POST completo: " . print_r($_POST, true));
error_log("nome: " . (isset($_POST['nome']) ? $_POST['nome'] : 'NÃO DEFINIDO'));
error_log("sobrenome: " . (isset($_POST['sobrenome']) ? $_POST['sobrenome'] : 'NÃO DEFINIDO'));
error_log("data_nascimento: " . (isset($_POST['data_nascimento']) ? $_POST['data_nascimento'] : 'NÃO DEFINIDO'));
error_log("cpf: " . (isset($_POST['cpf']) ? $_POST['cpf'] : 'NÃO DEFINIDO'));
error_log("telefone: " . (isset($_POST['telefone']) ? $_POST['telefone'] : 'NÃO DEFINIDO'));
error_log("email: " . (isset($_POST['email']) ? $_POST['email'] : 'NÃO DEFINIDO'));
error_log("senha: " . (isset($_POST['senha']) ? 'DEFINIDA' : 'NÃO DEFINIDA'));
error_log("==============================");

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// Carrega as classes do PHPMailer
require 'PHPMailer/PHPMailer.php';
require 'PHPMailer/SMTP.php';
require 'PHPMailer/Exception.php';

if (isset($_POST['nome'], $_POST['sobrenome'], $_POST['data_nascimento'], $_POST['cpf'], $_POST['telefone'], $_POST['email'], $_POST['senha'])) {
    $nome = trim($_POST['nome']);
    $sobrenome = trim($_POST['sobrenome']);
    $dataNascimento = $_POST['data_nascimento'];
    $cpf = preg_replace('/\D/', '', $_POST['cpf']); // Remove caracteres não numéricos
    $telefone = preg_replace('/\D/', '', $_POST['telefone']); // Remove caracteres não numéricos
    $email = trim($_POST['email']);
    $senha = $_POST['senha'];

    // Validações adicionais
    if (empty($nome) || empty($sobrenome) || empty($dataNascimento) || empty($cpf) || empty($telefone) || empty($email) || empty($senha)) {
        echo json_encode(['success' => false, 'message' => 'Um ou mais campos estão vazios após o trim.']);
        exit;
    }

    // Hash seguro da senha
    $hashSenha = password_hash($senha, PASSWORD_DEFAULT);

    $token = bin2hex(random_bytes(16)); // Gera token aleatório

    $conn = new mysqli("localhost", "u339248760_proatleta1", "Vini@#07alves", "u339248760_proatleta");

    if ($conn->connect_error) {
        echo json_encode(['success' => false, 'message' => 'Erro de conexão com o banco de dados.']);
        exit;
    }

    // Verifica se o email já existe na tabela aluno
    $verificacao = $conn->prepare("SELECT id FROM aluno WHERE email = ?");
    $verificacao->bind_param("s", $email);
    $verificacao->execute();
    $verificacao->store_result();

    if ($verificacao->num_rows > 0) {
        echo json_encode(['success' => false, 'message' => 'Este email já está cadastrado como aluno.']);
        $verificacao->close();
        $conn->close();
        exit;
    }
    $verificacao->close();

    // Verifica se o email já existe na tabela professor
    $verificacao = $conn->prepare("SELECT id FROM professor WHERE email = ?");
    $verificacao->bind_param("s", $email);
    $verificacao->execute();
    $verificacao->store_result();

    if ($verificacao->num_rows > 0) {
        echo json_encode(['success' => false, 'message' => 'Este email já está cadastrado como professor.']);
        $verificacao->close();
        $conn->close();
        exit;
    }
    $verificacao->close();

    // Verifica se o CPF já existe na tabela aluno
    $verificacao = $conn->prepare("SELECT id FROM aluno WHERE cpf = ?");
    $verificacao->bind_param("s", $cpf);
    $verificacao->execute();
    $verificacao->store_result();

    if ($verificacao->num_rows > 0) {
        echo json_encode(['success' => false, 'message' => 'Este CPF já está cadastrado.']);
        $verificacao->close();
        $conn->close();
        exit;
    }
    $verificacao->close();

    $fotoPadrao = 'https://proatleta.site/padrao/user.jpg';

    // Insere o professor no banco de dados com hash da senha
    $stmt = $conn->prepare("INSERT INTO professor (nome, sobrenome, data_nasc, cpf, telefone, email, senha, verificado, token_verificado, foto) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)");
    $stmt->bind_param("sssssssss", $nome, $sobrenome, $dataNascimento, $cpf, $telefone, $email, $hashSenha, $token, $fotoPadrao);

    if ($stmt->execute()) {
        // Configura o PHPMailer
        $mail = new PHPMailer(true);
        $mail->CharSet = 'UTF-8';

        try {
            $mail->isSMTP();
            $mail->Host = 'smtp.hostinger.com';
            $mail->SMTPAuth = true;
            $mail->Username = 'contato@proatleta.site';
            $mail->Password = 'Vini@#07alves';
            $mail->SMTPSecure = 'ssl';
            $mail->Port = 465;

            $mail->setFrom('contato@proatleta.site', 'ProAtleta');
            $mail->addAddress($email, $nome);

            $mail->isHTML(true);
            $mail->Subject = 'Confirmação de Cadastro - ProAtleta';

            // link seguro
            $link = "https://proatleta.site/verificar.php?email=" . urlencode($email) . "&token=" . urlencode($token);
            $safe_nome = htmlspecialchars($nome, ENT_QUOTES, 'UTF-8');

            // corpo do e-mail
            $mail->Body = <<< HTML
                <div style="font-family: Arial, sans-serif; text-align: center; background-color: #FF6600; color: #ffffff; padding: 20px; border-radius: 10px; width:90%; margin:0 auto;">
                    <h2 style="color:#ffffff; margin:0 0 12px 0;">Olá {$safe_nome},</h2>
                    <p style="color:#ffffff; font-size:16px; margin:0 0 16px 0;">Clique no botão abaixo para confirmar seu cadastro:</p>
                    <a href="{$link}" style="display:inline-block; background:#ffffff; color:#FF6600; padding:12px 20px; border-radius:5px; text-decoration:none; font-weight:bold;">Confirmar cadastro</a>
                </div>
            HTML;

            // texto alternativo
            $mail->AltBody = "Olá {$safe_nome},\n\nClique no link para confirmar seu cadastro:\n{$link}\n\nSe necessário, copie e cole o link no navegador.";

            $mail->send();
            echo json_encode(['success' => true, 'message' => 'Cadastro realizado! Verifique seu e-mail.']);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => "Erro ao enviar e-mail: {$mail->ErrorInfo}"]);
        }

    } else {
        echo json_encode(['success' => false, 'message' => 'Erro ao cadastrar.']);
    }

    $stmt->close();
    $conn->close();
} else {
    // Retorna quais campos estão faltando
    $missing = [];
    if (!isset($_POST['nome']))        $missing[] = 'nome';
    if (!isset($_POST['sobrenome']))   $missing[] = 'sobrenome';
    if (!isset($_POST['data_nascimento'])) $missing[] = 'data_nascimento';
    if (!isset($_POST['cpf']))         $missing[] = 'cpf';
    if (!isset($_POST['telefone']))    $missing[] = 'telefone';
    if (!isset($_POST['email']))       $missing[] = 'email';
    if (!isset($_POST['senha']))       $missing[] = 'senha';

    echo json_encode(['success' => false, 'message' => 'Campos obrigatórios faltando: ' . implode(', ', $missing)]);
}
?>