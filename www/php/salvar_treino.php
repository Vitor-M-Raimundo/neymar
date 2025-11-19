<?php
// Inicia buffer de saída para evitar qualquer saída indesejada
ob_start();

// Cabeçalhos CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=UTF-8');

// Responde a preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Configura log de erros sem exibir no navegador
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

// Conexão com o banco
$host = "localhost";
$usuario = "u339248760_proatleta1";
$senha = "Vini@#07alves";
$banco = "u339248760_proatleta";

$conn = new mysqli($host, $usuario, $senha, $banco);

if ($conn->connect_error) {
    ob_end_clean();
    echo json_encode(['success' => false, 'message' => 'Erro na conexão: ' . $conn->connect_error]);
    exit;
}

// Captura parâmetros do POST
$professor_id = $_POST['professor_id'] ?? null;
$email_aluno = $_POST['email_aluno'] ?? null;
$nome_treino = $_POST['nome_treino'] ?? null;
$tipo_treino = $_POST['tipo_treino'] ?? null;
$data_treino = $_POST['data_treino'] ?? null;
$observacoes = $_POST['observacoes'] ?? '';

// Processar exercícios do JSON
$exercicios = [];
if (isset($_POST['exercicios'])) {
    $exerciciosJson = $_POST['exercicios'];
    $exerciciosArray = json_decode($exerciciosJson, true);
    
    if (json_last_error() === JSON_ERROR_NONE && is_array($exerciciosArray)) {
        foreach ($exerciciosArray as $ordem => $exercicio) {
            if (!empty($exercicio['nome']) && !empty($exercicio['series']) && !empty($exercicio['repeticoes'])) {
                $exercicios[] = [
                    'nome' => trim($exercicio['nome']),
                    'series' => intval($exercicio['series']),
                    'repeticoes' => trim($exercicio['repeticoes']),
                    'descanso' => intval($exercicio['descanso'] ?? 60),
                    'observacoes' => trim($exercicio['observacoes'] ?? ''),
                    'video_arquivo' => trim($exercicio['video_arquivo'] ?? ''),
                    'ordem' => intval($ordem)
                ];
            }
        }
    }
}

// Valida parâmetros obrigatórios
if (!$professor_id || !$email_aluno || !$nome_treino) {
    ob_end_clean();
    echo json_encode(['success' => false, 'message' => 'Dados incompletos']);
    exit;
}

// Valida se o professor_id é numérico
if (!filter_var($professor_id, FILTER_VALIDATE_INT)) {
    ob_end_clean();
    echo json_encode(['success' => false, 'message' => 'ID do professor inválido']);
    exit;
}

// Busca o ID do aluno pelo email
$stmt = $conn->prepare("SELECT id FROM aluno WHERE email = ?");
$stmt->bind_param("s", $email_aluno);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows == 0) {
    ob_end_clean();
    echo json_encode(['success' => false, 'message' => 'Aluno não encontrado']);
    exit;
}

$aluno = $result->fetch_assoc();
$aluno_id = $aluno['id'];

// Verifica se existe vínculo entre professor e aluno
$stmt = $conn->prepare("SELECT * FROM aluno_professor WHERE Aluno_ID = ? AND Professor_ID = ?");
$stmt->bind_param("ii", $aluno_id, $professor_id);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows == 0) {
    ob_end_clean();
    echo json_encode(['success' => false, 'message' => 'Você não tem permissão para criar treinos para este aluno']);
    exit;
}

// Inicia transação
$conn->begin_transaction();

try {
    // Insere o treino na tabela
    $stmt = $conn->prepare("INSERT INTO treinos (professor_id, aluno_id, nome_treino, tipo_treino, data_treino, observacoes, criado_em, atualizado_em, ativo) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW(), 1)");
    $stmt->bind_param("iissss", $professor_id, $aluno_id, $nome_treino, $tipo_treino, $data_treino, $observacoes);
    
    if (!$stmt->execute()) {
        throw new Exception("Erro ao salvar treino: " . $stmt->error);
    }
    
    $treino_id = $conn->insert_id;
    
    // Insere os exercícios
    if (!empty($exercicios)) {
        foreach ($exercicios as $exercicio) {
            $stmt_exercicio = $conn->prepare("
                INSERT INTO exercicios (treino_id, nome, series, repeticoes, descanso, observacoes, video_arquivo, ordem) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            $nome_exercicio = $exercicio['nome'];
            $series = $exercicio['series'];
            $repeticoes = $exercicio['repeticoes'];
            $descanso = $exercicio['descanso'];
            $observacoes_exercicio = $exercicio['observacoes'];
            $video_arquivo = !empty($exercicio['video_arquivo']) ? $exercicio['video_arquivo'] : NULL;
            $ordem_exercicio = $exercicio['ordem'];
            
            // Validar URL do vídeo se fornecida
            if ($video_arquivo && !filter_var($video_arquivo, FILTER_VALIDATE_URL)) {
                $video_arquivo = NULL; // Remove URL inválida
            }
            
            $stmt_exercicio->bind_param("ississsi", 
                $treino_id, 
                $nome_exercicio, 
                $series, 
                $repeticoes, 
                $descanso, 
                $observacoes_exercicio, 
                $video_arquivo, 
                $ordem_exercicio
            );
            
            if (!$stmt_exercicio->execute()) {
                throw new Exception("Erro ao inserir exercício: " . $stmt_exercicio->error);
            }
            
            $stmt_exercicio->close();
        }
    } else {
        throw new Exception("Pelo menos um exercício é obrigatório");
    }
    
    // Confirma a transação
    $conn->commit();
    
    ob_end_clean();
    echo json_encode([
        'success' => true, 
        'message' => 'Treino salvo com sucesso!',
        'treino_id' => $treino_id
    ]);
    
} catch (Exception $e) {
    // Desfaz a transação em caso de erro
    $conn->rollback();
    
    ob_end_clean();
    echo json_encode([
        'success' => false, 
        'message' => 'Erro ao salvar treino: ' . $e->getMessage()
    ]);
}

$conn->close();
?>