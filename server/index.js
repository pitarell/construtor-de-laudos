const express = require('express')
const cors = require('cors')
const fs = require('fs')
const path = require('path')
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Header,
  Footer,
  AlignmentType,
  HeadingLevel,
  ImageRun,
  PageNumber,
} = require('docx')

const app = express()
app.use(cors())
app.use(express.json())

// ---------------------------------------------------------------------
// Carregamento opcional de logotipos
// Coloque os arquivos em: server/assets/logo_ssp.png e logo_ic.png
// ---------------------------------------------------------------------
let logoSspBuffer = null
let logoIcBuffer = null

try {
  logoSspBuffer = fs.readFileSync(path.join(__dirname, 'assets', 'logo_ssp.png'))
} catch (e) {
  console.warn(
    'Logo SSP não encontrado em server/assets/logo_ssp.png. Cabeçalho será gerado sem este logo.',
  )
}

try {
  logoIcBuffer = fs.readFileSync(path.join(__dirname, 'assets', 'logo_ic.png'))
} catch (e) {
  console.warn(
    'Logo IC não encontrado em server/assets/logo_ic.png. Cabeçalho será gerado sem este logo.',
  )
}

// ---------------------------------------------------------------------
// Funções de montagem de texto – cópia do front para manter padrão
// ---------------------------------------------------------------------

function buildPreambulo(r) {
  const data = (r.receivedAt || '[data de recebimento da peça]').trim()
  const cidade = (r.cidadeIC || '[cidade do IC]').trim()
  const diretor = (r.diretorIC || '[Diretor do IC]').trim()
  const perito = (r.peritoRelator || '[Perito Relator]').trim()
  const cargo = (r.cargoAutoridade || '[Cargo da Autoridade]').trim()
  const autoridade = (r.autoridadeRequisitante || '[Autoridade]').trim()
  const delegacia = (r.delegaciaDestino || '[Delegacia requisitante/Destino]').trim()
  const origem = (r.origem || '[Origem]').trim()

  return (
    `Aos ${data}, na cidade de ${cidade} e no INSTITUTO DE CRIMINALÍSTICA, da SPTC - Superintendência da Policia Técnico Científica, ` +
    `da Secretaria da Segurança Pública do Estado de São Paulo, de conformidade com o disposto no artigo 178 do Decreto-Lei nº3.689 de 3 de outubro de 1.941 ` +
    `e alterado pela Lei 11690 de 9 de junho de 2008, foi designado pelo Diretor deste Instituto ${diretor}, o Perito Criminal ${perito} ` +
    `para proceder ao exame supra especificado, em atendimento à requisição ${cargo} ${autoridade} da ${delegacia}, referente ao ${origem}.`
  )
}

function buildObjetivos(r) {
  const origem = (r.origem || '[origem]').trim()
  const delegacia = (r.delegaciaDestino || '[Delegacia requisitante/Destino]').trim()
  const re = (r.re || '[RE]').trim()
  const objetivo = (r.objetivo || '[Objetivo]').trim()

  return (
    `Conforme se depreende da leitura dos termos da requisição de exame pericial, relacionada ao ${origem} da ${delegacia}, ` +
    `registrada nessa equipe como ${re}, a presente perícia tem com o objetivo: ${objetivo}.`
  )
}

function buildQuesitosTexto(r) {
  if (r.hasQuesitos !== 'sim' || !r.quesitos || !r.quesitos.length) {
    return ['QUESITOS E RESPOSTAS', '', 'Não foram apresentados quesitos específicos para esta perícia.'].join('\n')
  }

  const linhas = r.quesitos.map((q, idx) => {
    const pergunta = (q.pergunta || '[Pergunta não preenchida]').trim()
    const resposta = (q.resposta || '[Resposta não preenchida]').trim()
    return `Quesito ${idx + 1}\nPergunta: ${pergunta}\nResposta: ${resposta}`
  })

  return ['QUESITOS E RESPOSTAS', ...linhas].join('\n\n')
}

function buildDescricaoCelular(r) {
  const tipoLacreRaw = (r.peca_tipoLacre || '').trim() || 'lacre não informado'
  const tipoDisp = (r.peca_tipoDispositivo || '').trim() || 'dispositivo não informado'
  const marca = (r.aparelho_marca || '').trim() || '[marca]'
  const modelo = (r.aparelho_modelo || '').trim() || '[modelo]'
  const cor = (r.aparelho_cor || '').trim() || '[cor]'
  const estado = (r.aparelho_estadoUso || '').trim() || '[estado]'

  const infoPreset = (r.aparelho_infoExternaPreset || '').trim() || '[informações impressas]'
  const infoTexto = (r.aparelho_infoExternaTexto || '').trim()
  const infoExterna = infoTexto ? `${infoPreset} ${infoTexto}` : infoPreset

  const lacreNum = (r.lacreRecebimento || '').trim()
  let tipoLacre = tipoLacreRaw
  if (lacreNum) {
    if (tipoLacreRaw.includes('lacre número')) {
      tipoLacre = `${tipoLacreRaw} ${lacreNum}`
    } else {
      tipoLacre = `${tipoLacreRaw} de número ${lacreNum}`
    }
  }

  const basePeca =
    `Aportou nesse IC, lacrado em ${tipoLacre} um ${tipoDisp} de marca de fabricação ${marca}, ` +
    `de modelo ${modelo} de cor ${cor}, ${estado}, ${infoExterna}.`

  const bateriaAcompanhava =
    r.acompanhava_bateria === 'sim'
      ? 'Acompanhava sua bateria.'
      : r.acompanhava_bateria === 'nao'
      ? 'Não acompanhava bateria.'
      : ''

  const bateriaEstado =
    r.peca_bateriaDescarregada === 'sim'
      ? 'Cumpre consignar que o dispositivo se encontrava com bateria descarregada e foi necessária à sua recarga elétrica.'
      : ''

  const gavetaImei =
    r.gavetaImei_presente === 'sim'
      ? `Apresentava em sua gaveta para cartões o IMEI: ${(r.gavetaImei_valor || '').trim() || 'X'}.`
      : ''

  let simText = ''
  if (r.sim && r.sim.mode === 'one_inside') {
    simText = `No interior de sua gaveta para cartões havia um cartão do tipo SIM, da operadora ${
      r.sim.operadora1 || 'Escolher um item.'
    } com ICCID ${r.sim.iccid1 || 'XXX'}.`
  } else if (r.sim && r.sim.mode === 'two_inside') {
    simText =
      `No interior de sua gaveta para cartões havia dois cartões do tipo SIM, respectivamente inseridos como SIM 1 o cartão da operadora ${
        r.sim.operadora1 || 'Escolher um item.'
      } com ICCID ${r.sim.iccid1 || 'XXX'} ` +
      `e o SIM 2 o cartão da operadora ${r.sim.operadora2 || 'Escolher um item.'} com ICCID ${
        r.sim.iccid2 || 'XXX'
      }.`
  } else if (r.sim && r.sim.mode === 'one_external') {
    simText = `Acompanhava externamente este aparelho um cartão do tipo SIM da operadora ${
      r.sim.operadora1 || 'Escolher um item.'
    } com ICCID ${r.sim.iccid1 || 'XXX'}.`
  } else if (r.sim && r.sim.mode === 'two_external') {
    simText =
      `Acompanhava externamente este aparelho dois cartões do tipo SIM sendo um da operadora ${
        r.sim.operadora1 || 'Escolher um item.'
      } com ICCID ${r.sim.iccid1 || 'XXX'} ` +
      `e o outro da operadora ${r.sim.operadora2 || 'Escolher um item.'} com ICCID ${
        r.sim.iccid2 || 'XXX'
      }.`
  }

  let memText = ''
  if (r.memory && r.memory.mode === 'inside') {
    memText =
      `No interior de sua gaveta para cartões havia um cartão do tipo micro SD, da marca ${
        r.memory.marca || 'Sandisk'
      }, ` +
      `com capacidade de armazenar ${r.memory.capacidadeGb || 'XX'} GB com número de série ${
        r.memory.serie || 'XXX'
      }.`
  } else if (r.memory && r.memory.mode === 'external') {
    memText =
      `Acompanhava externamente este aparelho, um cartão de memória, do tipo micro SD, da marca ${
        r.memory.marca || 'Sandisk'
      }, ` +
      `com capacidade de armazenar ${r.memory.capacidadeGb || 'XX'} GB com número de série ${
        r.memory.serie || 'XXX'
      }.`
  }

  const listaPart = Array.isArray(r.particularidades) ? r.particularidades.slice() : []
  const outras = (r.particularidadesOutras || '').trim()
  if (outras) listaPart.push(outras)
  const partText = listaPart.length ? listaPart.join('\n') : ''

  const blocks = [
    'DA PEÇA',
    basePeca,
    bateriaAcompanhava,
    bateriaEstado,
    gavetaImei,
    '',
    'PARTICULARIDADE',
    partText || '(Não se aplica.)',
    'SIM CARD',
    simText || '(Não se aplica.)',
    '',
    'Memory Card',
    memText || '(Não se aplica.)',
    '',
  ]

  return blocks.filter((x) => x !== '').join('\n')
}

function buildRegistroFotografico(r) {
  if (!r.photos || !r.photos.length) {
    return 'REGISTRO FOTOGRÁFICO\n(Não há fotos registradas neste módulo.)'
  }

  const linhas = r.photos.map((p, idx) => {
    const base = (p.legendaPreset || '').trim()
    const extra = (p.legendaTexto || '').trim()
    const texto = [base, extra].filter(Boolean).join(' ')
    return `Figura ${idx + 1} – ${texto || 'Legenda não informada.'}`
  })

  return ['REGISTRO FOTOGRÁFICO', ...linhas].join('\n')
}

function buildFinalizacao(r) {
  const lacreSaida = (r.lacreSaida || '').trim() || '[Lacre de saída]'
  const rep = (r.rep || '').trim() || '[REP]'
  const local = (r.finalLocal || '').trim() || (r.cidadeIC || '').trim() || '[Local]'
  const data = (r.finalData || '').trim() || '[Data]'
  const perito = (r.peritoRelator || '').trim() || '[Nome do Perito]'

  return [
    'Era o que havia a relatar.',
    '',
    `Acompanha o presente laudo o aparelho celular, devidamente acondicionado em invólucro plástico, dotado de lacre nº SPTC ${lacreSaida}.`,
    `Este laudo n° ${rep} segue assinado digitalmente, dele ficando seu conteúdo arquivado no Sistema Gestor de Laudos da Superintendência da Polícia Técnico Científica do Estado de São Paulo.`,
    '',
    `${local}, ${data}`,
    '',
    perito,
    'Perito(a) Criminal',
    'Assinado digitalmente.',
  ].join('\n')
}

function buildLaudoCompleto(r) {
  const preambulo = buildPreambulo(r)
  const objetivos = buildObjetivos(r)
  const quesitos = buildQuesitosTexto(r)
  const descricao = buildDescricaoCelular(r)
  const fotos = buildRegistroFotografico(r)
  const finalizacao = buildFinalizacao(r)

  const header = ['LAUDO PERICIAL']

  const blocos = [
    ...header,
    'PREÂMBULO',
    preambulo,
    '',
    'OBJETIVOS',
    objetivos,
    '',
    quesitos,
    '',
    'DESCRIÇÃO DO CELULAR',
    descricao,
    '',
    fotos,
    '',
    finalizacao,
  ]

  return blocos.join('\n')
}

// ---------------------------------------------------------------------
// Geração do DOCX com layout (página, cabeçalho, rodapé, logos)
// ---------------------------------------------------------------------

function createDocxFromLaudo(report) {
  const laudoTexto = buildLaudoCompleto(report)
  const linhas = laudoTexto.split('\n')

  const children = []

  for (const linha of linhas) {
    const trimmed = linha.trim()

    if (!trimmed) {
      children.push(new Paragraph({ text: '' }))
      continue
    }

    const isTituloCapitulo =
      trimmed === 'LAUDO PERICIAL' ||
      trimmed === 'PREÂMBULO' ||
      trimmed === 'OBJETIVOS' ||
      trimmed === 'DESCRIÇÃO DO CELULAR' ||
      trimmed === 'REGISTRO FOTOGRÁFICO' ||
      trimmed === 'QUESITOS E RESPOSTAS'

    if (isTituloCapitulo) {
      children.push(
        new Paragraph({
          text: trimmed,
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
      )
    } else {
      children.push(
        new Paragraph({
          children: [new TextRun(trimmed)],
          alignment: AlignmentType.JUSTIFIED,
          spacing: { line: 360 }, // 1,5
        }),
      )
    }
  }

  // Cabeçalho com logos (se existirem) + textos institucionais
  const headerChildren = []

  if (logoSspBuffer || logoIcBuffer) {
    const imgRuns = []

    if (logoSspBuffer) {
      imgRuns.push(
        new ImageRun({
          data: logoSspBuffer,
          transformation: {
            width: 70,
            height: 70,
          },
        }),
      )
    }

    if (logoIcBuffer) {
      imgRuns.push(
        new ImageRun({
          data: logoIcBuffer,
          transformation: {
            width: 70,
            height: 70,
          },
        }),
      )
    }

    headerChildren.push(
      new Paragraph({
        children: imgRuns,
        alignment: AlignmentType.CENTER,
      }),
    )
  }

  headerChildren.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'Secretaria da Segurança Pública',
          bold: true,
        }),
      ],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'Superintendência da Polícia Técnico-Científica',
          bold: true,
        }),
      ],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      text: 'Instituto de Criminalística',
      alignment: AlignmentType.CENTER,
    }),
  )

  // Rodapé com paginação
  const footerChildren = [
    new Paragraph({
      children: [
        new TextRun({
          children: ['Página ', PageNumber.CURRENT, ' de ', PageNumber.TOTAL_PAGES],
        }),
      ],
      alignment: AlignmentType.RIGHT,
    }),
  ]

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Times New Roman',
            size: 24, // 12pt
          },
          paragraph: {
            spacing: {
              line: 360, // 1,5
            },
          },
        },
      },
    },
    sections: [
      {
        headers: {
          default: new Header({
            children: headerChildren,
          }),
        },
        footers: {
          default: new Footer({
            children: footerChildren,
          }),
        },
        properties: {
          page: {
            margin: {
              top: 1700, // ~3 cm
              left: 1700, // ~3 cm
              right: 1134, // ~2 cm
              bottom: 1134, // ~2 cm
            },
          },
        },
        children,
      },
    ],
  })

  return Packer.toBuffer(doc)
}

// ---------------------------------------------------------------------
// Rota principal – usada pelo front em /api/laudos/celular/docx
// ---------------------------------------------------------------------

app.post('/api/laudos/celular/docx', async (req, res) => {
  try {
    const report = req.body.report
    if (!report) {
      return res.status(400).json({ error: 'Corpo da requisição sem report.' })
    }

    const buffer = await createDocxFromLaudo(report)

    const fileName =
      report.rep && String(report.rep).trim()
        ? `laudo_${String(report.rep).trim()}.docx`
        : 'laudo_celular.docx'

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    )
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
    res.send(buffer)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao gerar DOCX.' })
  }
})

// ---------------------------------------------------------------------
// Inicialização do servidor
// ---------------------------------------------------------------------

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Servidor iniciado na porta ${PORT}`)
})
