function status(request, response) {
  response.status(200).json({ chave: "alunos são acima da média?" });
}

export default status;
