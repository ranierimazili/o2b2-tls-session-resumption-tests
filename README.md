# o2b2-tls-session-resumption-tests
Projeto para testar o uso do recurso TLS Session Resumption e medir o desempenho com e sem o recurso ativado

## Configurações

No arquivo index.js, edite as variáveis _host_, _port_, _endpoint_, _reuseSession_ e counter para atender ao seu cenário de teste.

* **host**: hostname do servidor onde será aberta a conexão
* **port**: porta ssl/tls (geralmente 443)
* **endpoint**: endpoint para realização de um GET e medição da performance. Recomendado que seja um conteúdo estático, como uma página HTML pura ou uma imagem.
* **reuseSession**: indica se o programa deve reutilizar a sessão (TLS Session Resumption) ou não
* **counter**: número de conexões que serão abertas contra o host informado

### mTLS
Caso seu host esteja configurado para obrigar o mTLS, copie chave pública e privada de conexão para o diretório raiz deste projeto, nomeando os arquivos conforme abaixo.

* **Chave pública:** client-cert.pem
* **Chave privada:** client-key.pem

## TLS Session Resumption
TLS Session Resumption é um recurso que, uma vez configurado no servidor que está recebendo a conexão, possibilita ao cliente a reutilização da sessão em conexões posteriores, diminuindo do tempo do TLS Handshake no estabelecimento da conexão.

Essa diminuição do tempo dá-se devido a possibilidade de "pular" algumas etapas do handshake quando a sessão é reaproveitada. Essas etapas que "puladas" podem ser notadas nos prints abaixo extraídos da monitoria da conexão via wireshark.

### Conexão sem TLS Session Resumption
![conexao_completa](https://github.com/ranierimazili/o2b2-tls-session-resumption-tests/assets/15436207/ccce412f-5309-4d32-84e3-e75807f6e1ef)

### Conexão com TLS Session Resumption
![conexao_reused](https://github.com/ranierimazili/o2b2-tls-session-resumption-tests/assets/15436207/fcd665a6-dc2e-4e6d-a957-3bb883b1d938)

### Conexão - Comparação entre conexão com e sem TLS Session Resumption
As linhas ou itens riscados são as etapas que não existem em uma conexão com a utilização do TLS Session Resumption
![conexao_completa - diff](https://github.com/ranierimazili/o2b2-tls-session-resumption-tests/assets/15436207/b33e9948-b170-49f5-b9a0-93a2d1fad948)

## Testes realizados

Foi configurado um servidor Nginx para receber as conexões e 3 configurações distintas foram realizadas e em cada uma delas o programa foi executado para realização da medição da performance.
Nos logs do Nginx, foi adicionada a variável $ssl_session_reused, que indica quando uma conexão é derivada de uma sessão existente ou não.

### Sem TLS Session Resumption
No Nginx foi configurado os valores abaixo para desativação completa do TLS Session Resumption.
```
ssl_session_tickets off;
ssl_session_cache off;
```

### Com TLS Session Resumption (Session ID)
No Nginx foi configurado os valores abaixo para desativação completa do TLS Session Resumption.
```
ssl_session_tickets off;
ssl_session_cache shared:SSL:10m;
```

### Com TLS Session Resumption (Session Ticket)
No Nginx foi configurado os valores abaixo para desativação completa do TLS Session Resumption.
```
ssl_session_tickets on;
ssl_session_cache off;
```

## Resultados dos testes

Para cada um dos cenários abaixo foram realizadas 100 conexões.

### Conexão sem TLS Session Resumption
The connection time average is: 528.18<br>
The request time average is: 166.31

### Conexão com TLS Session Resumption (Session ID)
The connection time average is: 345.68 (35% mais rápido)<br>
The request time average is: 166.86

### Conexão com TLS Session Resumption (Session Ticket)
The connection time average is: 338.39 (36% mais rápido)<br>
The request time average is: 160.02

## Conclusão
O ganho de desempenho dá-se apenas no processo de abertura de conexão, não no tempo total da requisição.
No exemplo acima, como o maior tempo gasto é o tempo de conexão, há um ganho médio de 186 milisegundos por conexão.

Esse ganho é constante nas conexões, portanto em um cenário onde uma API demore 2.5 segundos para a resposta total, sendo 500 milisegundos para o estabelecimento da conexão e 2 segundos para obtenção e retorno dos dados em sua infraestrutura interna, com o TLS Session Resumption ativado, essa API retornaria em aprox. 2.3 segundos, reduzindo o tempo de estabelecimento de conexão para 300 milisegundos e mantendo os 2 segundos para obtenção e retorno dos dados em sua infraestrutura interna.

É preciso enfatizar que a utilização da reutilização da sessão é uma liberdade do cliente (receptor), ou seja, a habilitação do lado servidor (transmissor) não obriga o cliente a utilizar o recurso TLS Session Resumption.

Foi notado que a reutilização da sessão não é um recurso nativo do lado cliente em NodeJS, e talvez também não o seja em outras linguagens, portanto a tendência é que a ativação do recurso por parte dos servidores (transmissoras) causará impacto ínfimo nas métricas atuais do ecossistema.

Do ponto de vista de segurança, a ativação do recurso não traz novos riscos, pois o TLS Session Resumption não pula as etapas do mTLS, ou seja, mesmo nas conexões reutilizadas, a utilização das chaves públicas e privadas continua necessária para realização das chamadas. Dessa forma, no caso de uma eventual perda/interceptação das sessões (session id ou session ticket), o interceptador não conseguiria tirar proveito da sessão uma vez que ele não possui as chaves públicas e privadas para realização do mTLS.


