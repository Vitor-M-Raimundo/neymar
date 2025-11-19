<?php


if (isset($_GET['email'], $_GET['token'])) {
    $email = $_GET['email'];
    $token = $_GET['token'];

    $conn = new mysqli("localhost", "u339248760_proatleta1", "Vini@#07alves", "u339248760_proatleta");

    if ($conn->connect_error) {
        die("Erro de conexão.");
    }

    $tabelas = [
        ['nome' => 'aluno'],
        ['nome' => 'professor']
    ];

    $tabelaEncontrada = null;

    foreach ($tabelas as $config) {
        $sql = "SELECT id FROM {$config['nome']} WHERE email = ? AND token_verificado = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("ss", $email, $token);
        $stmt->execute();
        $stmt->store_result();

        if ($stmt->num_rows > 0) {
            $tabelaEncontrada = $config['nome'];
            $stmt->close();
            break;
        }

        $stmt->close();
    }

    if ($tabelaEncontrada) {
        $update = $conn->prepare("UPDATE {$tabelaEncontrada} SET verificado = 1 WHERE email = ?");
        $update->bind_param("s", $email);
        $update->execute();
        $update->close();

        // Página de sucesso
        echo "
        <html>
            <head>
                <link rel='stylesheet' href='https://proatleta.site/css/verificar.css'>
            </head>
            <body>
                <div class='container'>
                    <h1>Email verificado com sucesso!</h1>
                    <p>Agora você já pode fazer login na sua conta e fechar esta janela do seu navegador.</p>
                </div>
            </body>
        </html>";
    } else {
        // Página de erro
        echo "
        <html>
            <head>
                <link rel='stylesheet' href='https://proatleta.site/css/verificar.css'>
            </head>
            <body>
                <img src='https://proatleta.site/img/logo.png' alt='ProAtleta Logo' class='logo'> <!-- Adiciona a logo -->
                <div class='container'>
                    <h1>Token inválido ou já verificado!</h1>
                    <p>Este token está inválido, ou já foi verificado anteriormente.</p>
                </div>
            </body>
        </html>";
    }

    $conn->close();
} else {
    echo "Parâmetros ausentes.";
}
?>