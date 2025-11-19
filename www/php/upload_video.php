<?php
// Log de debug
error_log("Upload de vídeo iniciado - " . date('Y-m-d H:i:s'));
error_log("FILES recebidos: " . print_r($_FILES, true));

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Método não permitido']);
    exit;
}

// Configurações de upload - salvar na mesma estrutura das fotos
$uploadDir = $_SERVER['DOCUMENT_ROOT'] . '/uploads/videos/';
$publicPath = 'https://proatleta.site/uploads/videos/';
$maxFileSize = 50 * 1024 * 1024; // 50MB
$allowedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov'];
$allowedExtensions = ['mp4', 'webm', 'ogg', 'avi', 'mov'];

error_log("Diretório de upload: " . $uploadDir);

// Criar diretório se não existir
if (!file_exists($uploadDir)) {
    if (!mkdir($uploadDir, 0755, true)) {
        error_log("Erro ao criar diretório: " . $uploadDir);
        echo json_encode(['success' => false, 'message' => 'Erro ao criar diretório de upload']);
        exit;
    }
    error_log("Diretório criado: " . $uploadDir);
}

try {
    if (!isset($_FILES['video']) || $_FILES['video']['error'] !== UPLOAD_ERR_OK) {
        $error = $_FILES['video']['error'] ?? 'arquivo não encontrado';
        error_log("Erro no arquivo: " . $error);
        throw new Exception('Erro no upload do arquivo: ' . $error);
    }

    $file = $_FILES['video'];
    error_log("Arquivo recebido: " . print_r($file, true));
    
    // Verificar tamanho do arquivo
    if ($file['size'] > $maxFileSize) {
        throw new Exception('Arquivo muito grande. Máximo permitido: 50MB');
    }
    
    // Verificar extensão
    $fileExtension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!in_array($fileExtension, $allowedExtensions)) {
        throw new Exception('Extensão de arquivo não permitida. Use: MP4, WEBM, OGG, AVI, MOV');
    }
    
    // Verificar tipo MIME se possível
    if (function_exists('finfo_file')) {
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $fileType = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);
        
        error_log("Tipo MIME detectado: " . $fileType);
        
        // Aceitar mais tipos MIME comuns para vídeo
        $allowedMimeTypes = [
            'video/mp4', 
            'video/webm', 
            'video/ogg', 
            'video/avi', 
            'video/mov',
            'video/quicktime',
            'video/x-msvideo'
        ];
        
        if (!in_array($fileType, $allowedMimeTypes)) {
            error_log("Tipo MIME não permitido: " . $fileType);
            // Não bloquear por tipo MIME, apenas avisar
        }
    }
    
    // Gerar nome único para o arquivo
    $fileName = 'video_' . date('Ymd_His') . '_' . uniqid() . '.' . $fileExtension;
    $targetPath = $uploadDir . $fileName;
    
    error_log("Caminho de destino: " . $targetPath);
    
    // Mover arquivo para destino final
    if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
        error_log("Erro ao mover arquivo de " . $file['tmp_name'] . " para " . $targetPath);
        throw new Exception('Erro ao salvar o arquivo no servidor');
    }
    
    // Verificar se o arquivo foi criado
    if (!file_exists($targetPath)) {
        error_log("Arquivo não existe após move_uploaded_file: " . $targetPath);
        throw new Exception('Arquivo não foi salvo corretamente');
    }
    
    // URL pública do arquivo
    $fileUrl = $publicPath . $fileName;
    
    error_log("Upload concluído com sucesso. URL: " . $fileUrl);
    
    echo json_encode([
        'success' => true,
        'video_url' => $fileUrl,
        'filename' => $fileName,
        'size' => $file['size'],
        'type' => $fileExtension
    ]);
    
} catch (Exception $e) {
    error_log("Erro no upload: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>
