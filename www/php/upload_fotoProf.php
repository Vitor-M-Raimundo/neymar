<?php
// Cabeçalhos CORS para liberar acesso cross-origin
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

header('Content-Type: application/json');

// Verifica se o arquivo e o email foram enviados
if (!isset($_FILES['foto2']) || !isset($_POST['email'])) {
    echo json_encode(['success' => false, 'message' => 'Dados incompletos']);
    exit;
}

$email = $_POST['email'];

// Pasta onde a imagem será salva
$uploadDir = 'uploads/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

$filename = basename($_FILES['foto2']['name']);
$ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
$allowed = ['jpg', 'jpeg', 'png', 'gif'];

if (!in_array($ext, $allowed)) {
    echo json_encode(['success' => false, 'message' => 'Tipo de arquivo não permitido']);
    exit;
}

$newName = uniqid('foto2_') . '.' . $ext;
$targetFile = $uploadDir . $newName;

$host = "localhost";
$usuario = "u339248760_proatleta1";
$senha = "Vini@#07alves";
$banco = "u339248760_proatleta";

try {
    $pdo = new PDO("mysql:host=$host;dbname=$banco;charset=utf8", $usuario, $senha);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Busca a foto antiga
    $stmt = $pdo->prepare("SELECT foto FROM professor WHERE email = ?");
    $stmt->execute([$email]);
    $fotoAntiga = $stmt->fetchColumn();

    // Move o novo arquivo
    if (move_uploaded_file($_FILES['foto2']['tmp_name'], $targetFile)) {
        $url = 'https://proatleta.site/' . $targetFile;

        // Atualiza a URL no banco
        $stmt = $pdo->prepare("UPDATE professor SET foto = ? WHERE email = ?");
        $stmt->execute([$url, $email]);

        // Remove a foto antiga, se estiver no diretório 'uploads/'
        if ($fotoAntiga && strpos($fotoAntiga, 'uploads/') !== false) {
            $caminhoRelativo = parse_url($fotoAntiga, PHP_URL_PATH);
            $caminhoLocal = $_SERVER['DOCUMENT_ROOT'] . $caminhoRelativo;

            if ($caminhoRelativo && file_exists($caminhoLocal)) {
                unlink($caminhoLocal);
            }
        }

        echo json_encode(['success' => true, 'url' => $url]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Falha ao salvar o arquivo']);
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erro ao salvar no banco: ' . $e->getMessage()]);
}
?>
