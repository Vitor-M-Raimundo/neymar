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

if (!isset($_FILES['foto']) || !isset($_POST['email'])) {
    echo json_encode(['success' => false, 'message' => 'Dados incompletos']);
    exit;
}

$email = $_POST['email'];

// Pasta onde a imagem será salva
$uploadDir = 'uploads/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

$filename = basename($_FILES['foto']['name']);
$ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
$allowed = ['jpg', 'jpeg', 'png', 'gif'];

if (!in_array($ext, $allowed)) {
    echo json_encode(['success' => false, 'message' => 'Tipo de arquivo não permitido']);
    exit;
}

$newName = uniqid('foto_') . '.' . $ext;
$targetFile = $uploadDir . $newName;

$host = "localhost";
$usuario = "u339248760_proatleta1";
$senha = "Vini@#07alves";
$banco = "u339248760_proatleta";

try {
    $pdo = new PDO("mysql:host=$host;dbname=$banco;charset=utf8", $usuario, $senha);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $stmt = $pdo->prepare("SELECT id, foto FROM aluno WHERE email = ?");
    $stmt->execute([$email]);
    $registro = $stmt->fetch(PDO::FETCH_ASSOC);
    $stmt->closeCursor();

    $tabelaDestino = 'aluno';

    if (!$registro) {
        $stmt = $pdo->prepare("SELECT id, foto FROM professor WHERE email = ?");
        $stmt->execute([$email]);
        $registro = $stmt->fetch(PDO::FETCH_ASSOC);
        $stmt->closeCursor();
        $tabelaDestino = $registro ? 'professor' : null;
    }

    if (!$registro || !$tabelaDestino) {
        echo json_encode(['success' => false, 'message' => 'Usuário não encontrado']);
        exit;
    }

    $fotoAntiga = $registro['foto'];

    // Move o novo arquivo
    if (move_uploaded_file($_FILES['foto']['tmp_name'], $targetFile)) {
        $url = 'https://proatleta.site/' . $targetFile;

        // Atualiza a URL no banco
        $stmt = $pdo->prepare("UPDATE {$tabelaDestino} SET foto = ? WHERE email = ?");
        $stmt->execute([$url, $email]);

        if ($fotoAntiga && strpos($fotoAntiga, 'uploads/') !== false) {
            // Extrai o caminho relativo da URL
            $caminhoRelativo = parse_url($fotoAntiga, PHP_URL_PATH); // ex: /uploads/foto_xxx.png
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