<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=utf-8");

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Método não permitido.']);
    exit;
}

// Leitura dos campos esperados
$expected = ['nome_inst','cnpj','nome_responsavel','sobrenome_responsavel','telefone','cep','cidade','bairro','numero','email','senha'];
foreach ($expected as $f) {
    if (!isset($_POST[$f])) {
        echo json_encode(['success' => false, 'message' => 'Parâmetro '.$f.' ausente.']);
        exit;
    }
}

$nome_inst = trim($_POST['nome_inst']);
$cnpj_raw = preg_replace('/\D/', '', $_POST['cnpj']);
$nome_responsavel = trim($_POST['nome_responsavel']);
$sobrenome_responsavel = trim($_POST['sobrenome_responsavel']);
$telefone_raw = preg_replace('/\D/','', $_POST['telefone']);
$cep_raw = preg_replace('/\D/','', $_POST['cep']);
$cidade = trim($_POST['cidade']);
$bairro = trim($_POST['bairro']);
$numero_raw = preg_replace('/\D/','', $_POST['numero']);
$email = trim($_POST['email']);
$senha = trim($_POST['senha']);

// Validações básicas
if (empty($nome_inst) || empty($cnpj_raw) || empty($nome_responsavel) || empty($telefone_raw) || empty($cep_raw) || empty($cidade) || empty($bairro) || empty($numero_raw) || empty($email) || empty($senha)) {
    echo json_encode(['success' => false, 'message' => 'Campos obrigatórios faltando.']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(['success' => false, 'message' => 'Email inválido.']);
    exit;
}

// Conexão ao banco (reaproveitar credenciais do projeto)
$conn = new mysqli("localhost", "u339248760_proatleta1", "Vini@#07alves", "u339248760");

if ($conn->connect_error) {
    echo json_encode(['success' => false, 'message' => 'Erro de conexão.']);
    exit;
}

// Verificar duplicidade de email ou CNPJ
$stmt = $conn->prepare("SELECT id FROM escolinha WHERE email = BINARY ? OR CNPJ = BINARY ?");
if (!$stmt) {
    echo json_encode(['success' => false, 'message' => 'Erro interno.']);
    $conn->close();
    exit;
}
$stmt->bind_param("ss", $email, $cnpj_raw);
$stmt->execute();
$stmt->store_result();
if ($stmt->num_rows > 0) {
    echo json_encode(['success' => false, 'message' => 'E-mail ou CNPJ já cadastrado.']);
    $stmt->close();
    $conn->close();
    exit;
}
$stmt->close();

// Preparar inserção
$rua = ''; // não coletado nas etapas; manter vazio
$cep_int = intval($cep_raw);
$numero_int = intval($numero_raw);
$foto = 'https://proatleta.site/padrao/user.jpg';
$verificado = 0;
$token_verificado = md5(uniqid(rand(), true)); // token simples

// Observação: a tabela define senha varchar(32) — para compatibilidade armazenamos como recebido.
// Se quiser, usar password_hash() e ajustar login posteriormente.
$insert = $conn->prepare("INSERT INTO escolinha (nome, CNPJ, nome_resp, sobrenome_resp, telefone, email, senha, rua, numero, bairro, cidade, CEP, verificado, token_verificado, foto) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
if (!$insert) {
    echo json_encode(['success' => false, 'message' => 'Erro interno ao preparar inserção.']);
    $conn->close();
    exit;
}
$insert->bind_param("sssssssssssisiss",
    $nome_inst,
    $cnpj_raw,
    $nome_responsavel,
    $sobrenome_responsavel,
    $telefone_raw,
    $email,
    $senha,
    $rua,
    $numero_int,
    $bairro,
    $cidade,
    $cep_int,
    $verificado,
    $token_verificado,
    $foto
);

if ($insert->execute()) {
    echo json_encode(['success' => true, 'message' => 'Cadastro realizado com sucesso. Verifique seu e-mail para ativação.']);
} else {
    echo json_encode(['success' => false, 'message' => 'Erro ao inserir no banco de dados.']);
}

$insert->close();
$conn->close();
?>