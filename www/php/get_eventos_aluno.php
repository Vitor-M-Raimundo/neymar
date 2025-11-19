<?php
// Configurações de debug
error_log("=== GET EVENTOS ALUNO - INICIO ===");

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    // Configuração da conexão com o banco de dados
    $host = "localhost";
    $usuario = "u339248760_proatleta1";
    $senha = "Vini@#07alves";
    $banco = "u339248760_proatleta";

    // Criar conexão
    $conn = new mysqli($host, $usuario, $senha, $banco);

    // Verificar conexão
    if ($conn->connect_error) {
        throw new Exception("Falha na conexão: " . $conn->connect_error);
    }

    // Definir charset
    $conn->set_charset("utf8");
    error_log("Conexão estabelecida com sucesso");

    // Verificar parâmetros
    if (!isset($_GET['aluno_id'])) {
        throw new Exception('ID do aluno é obrigatório');
    }

    $aluno_id = intval($_GET['aluno_id']);
    $mes = isset($_GET['mes']) ? trim($_GET['mes']) : date('Y-m');

    error_log("Parâmetros recebidos - Aluno ID: $aluno_id, Mês: $mes");

    // Validar aluno_id
    if ($aluno_id <= 0) {
        throw new Exception('ID do aluno inválido');
    }

    // Validar formato do mês
    if (!preg_match('/^\d{4}-\d{2}$/', $mes)) {
        throw new Exception('Formato de mês inválido. Use YYYY-MM');
    }

    // BUSCAR TODOS OS EVENTOS DO ALUNO - INDEPENDENTE DO PROFESSOR
    $sql = "SELECT 
                id,
                titulo,
                descricao,
                data_evento,
                horario_inicio,
                horario_fim,
                localizacao,
                tipo,
                professor_id,
                status_agenda,
                DATE_FORMAT(data_evento, '%Y-%m-%d') as data_formatada,
                TIME_FORMAT(horario_inicio, '%H:%i') as inicio_formatado,
                TIME_FORMAT(horario_fim, '%H:%i') as fim_formatado
            FROM agenda_eventos 
            WHERE aluno_id = ? 
            AND DATE_FORMAT(data_evento, '%Y-%m') = ?
            AND status_agenda = 'ativo'
            ORDER BY data_evento, horario_inicio";
    
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception('Erro ao preparar query: ' . $conn->error);
    }

    $stmt->bind_param("is", $aluno_id, $mes);
    
    if (!$stmt->execute()) {
        throw new Exception('Erro ao executar query: ' . $stmt->error);
    }
    
    $result = $stmt->get_result();
    error_log("Query executada com sucesso. Linhas encontradas: " . $result->num_rows);

    $eventos = [];
    while ($row = $result->fetch_assoc()) {
        $evento = [
            'id' => $row['id'],
            'titulo' => $row['titulo'],
            'descricao' => $row['descricao'] ?: '',
            'data' => $row['data_formatada'],
            'horario' => $row['inicio_formatado'] . ' - ' . $row['fim_formatado'],
            'local' => $row['localizacao'] ?: 'Local não informado',
            'tipo' => $row['tipo'] ?: 'treino',
            'professor_id' => $row['professor_id'],
            'horario_inicio' => $row['inicio_formatado'],
            'horario_fim' => $row['fim_formatado']
        ];
        
        $eventos[] = $evento;
        error_log("Evento adicionado: " . json_encode($evento));
    }

    $stmt->close();
    $conn->close();

    $response = [
        'success' => true,
        'eventos' => $eventos,
        'total' => count($eventos),
        'mes' => $mes,
        'aluno_id' => $aluno_id,
        'debug_info' => [
            'sql_executada' => 'busca_independente_professor',
            'parametros' => [
                'aluno_id' => $aluno_id,
                'mes' => $mes
            ]
        ]
    ];

    error_log("Resposta preparada: " . json_encode($response));
    echo json_encode($response);

} catch (Exception $e) {
    error_log('ERRO em get_eventos_aluno.php: ' . $e->getMessage());
    
    $error_response = [
        'success' => false,
        'message' => $e->getMessage(),
        'debug' => [
            'aluno_id' => isset($aluno_id) ? $aluno_id : 'não definido',
            'mes' => isset($mes) ? $mes : 'não definido',
            'erro_mysql' => isset($conn) ? $conn->error : 'conexão não estabelecida',
            'parametros_recebidos' => $_GET
        ]
    ];

    error_log("Erro response: " . json_encode($error_response));
    echo json_encode($error_response);

} catch (Error $e) {
    error_log('ERRO FATAL em get_eventos_aluno.php: ' . $e->getMessage());
    
    echo json_encode([
        'success' => false,
        'message' => 'Erro interno do servidor',
        'error_type' => 'Fatal Error'
    ]);
}

error_log("=== GET EVENTOS ALUNO - FIM ===");
?>