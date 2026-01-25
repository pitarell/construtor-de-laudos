import { useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'laudos:draft:descricao-celular:v1'

const steps = [
  'Informações iniciais',
  'Dados institucionais',
  'Preâmbulo',
  'Objetivos',
  'Quesitos e respostas',
  'Descrição do celular',
  'Registro fotográfico',
  'Finalização e assinatura',
  'Geração do laudo',
]

const LOOKUPS = {
  cidadesIC: ['Santo André'],
  diretoresIC: ['Diretor IC'],
  autoridades: ['Dr. Delegado', 'Drª Delegada'],
  delegacias: ['DP de Santo André'],
  cargosAutoridade: ['Delegado', 'Delegada'],

  marcas: ['Apple', 'Samsung', 'Motorola', 'Xiaomi', 'Huawei', 'LG', 'Nokia', 'Outro'],
  cores: [
    'Preto',
    'Branco',
    'Azul',
    'Vermelho',
    'Prata',
    'Dourado',
    'Cinza',
    'Roxo',
    'Laranja',
    'Verde',
  ],
  operadoras: ['Claro', 'Vivo', 'TIM', 'Oi', 'Outra'],

  lacres: [
    'em saco plástico transparente, dotado de lacre de coloração azul',
    'em saco plástico transparente, dotado de lacre de coloração amarela',
    'em invólucro plástico padrão SPTC, lacre número',
  ],
  dispositivos: ['Aparelho celular', 'Tablet'],
  infosExternas: [
    'que apresenta inscrições impressas em sua face posterior:',
    'que apresenta etiqueta em seu chassi com as seguintes inscrições impressas:',
    'que não apresenta informações relevantes impressas externamente',
  ],
} as const

type QuesitoItem = {
  pergunta: string
  resposta: string
}

type SimConfig =
  | { mode: 'none' }
  | { mode: 'one_inside'; operadora1: string; iccid1: string }
  | { mode: 'two_inside'; operadora1: string; iccid1: string; operadora2: string; iccid2: string }
  | { mode: 'one_external'; operadora1: string; iccid1: string }
  | { mode: 'two_external'; operadora1: string; iccid1: string; operadora2: string; iccid2: string }

type MemoryConfig =
  | { mode: 'none' }
  | { mode: 'inside'; marca: string; capacidadeGb: string; serie: string }
  | { mode: 'external'; marca: string; capacidadeGb: string; serie: string }

type PhotoItem = {
  id: number
  legendaPreset: string
  legendaTexto: string
}

type ReportDraft = {
  // Capítulo 1
  rep: string
  re: string
  receivedAt: string
  origem: string
  lacreRecebimento: string

  // Capítulo 2
  cidadeIC: string
  diretorIC: string
  cargoAutoridade: string
  autoridadeRequisitante: string
  delegaciaDestino: string
  quesitacao: string

  // Login (placeholder)
  peritoRelator: string

  // Capítulo 4
  objetivo: string
  hasQuesitos: '' | 'sim' | 'nao'

  // Capítulo 5
  quesitos: QuesitoItem[]

  // Capítulo 6 — Descrição do celular
  peca_tipoLacre: string
  peca_tipoDispositivo: string

  peca_bateriaDescarregada: '' | 'sim' | 'nao'

  aparelho_marca: string
  aparelho_modelo: string
  aparelho_cor: string
  aparelho_estadoUso: string
  aparelho_infoExternaPreset: string
  aparelho_infoExternaTexto: string

  gavetaImei_presente: '' | 'sim' | 'nao'
  gavetaImei_valor: string

  acompanhava_bateria: '' | 'sim' | 'nao'

  sim: SimConfig
  memory: MemoryConfig

  particularidades: string[]
  particularidadesOutras: string

  // Capítulo 7 — Registro fotográfico
  photos: PhotoItem[]

  // Capítulo 8 — Finalização e assinatura
  lacreSaida: string
  finalLocal: string
  finalData: string
}

type FieldErrors = Partial<Record<keyof ReportDraft, boolean>>

function safeParseDraft(raw: string | null): ReportDraft | null {
  if (!raw) return null
  try {
    const obj = JSON.parse(raw) as Partial<ReportDraft>

    const parsedQuesitos: QuesitoItem[] = Array.isArray(obj.quesitos)
      ? obj.quesitos.map((q: any) => ({
          pergunta: String(q?.pergunta ?? ''),
          resposta: String(q?.resposta ?? ''),
        }))
      : []

    const parsedPart: string[] = Array.isArray(obj.particularidades)
      ? obj.particularidades.map((x: any) => String(x))
      : []

    const sim = (obj.sim ?? { mode: 'none' }) as SimConfig
    const memory = (obj.memory ?? { mode: 'none' }) as MemoryConfig

    const parsedPhotos: PhotoItem[] = Array.isArray((obj as any).photos)
      ? (obj as any).photos.map((p: any, index: number) => ({
          id: typeof p?.id === 'number' ? p.id : index + 1,
          legendaPreset: String(p?.legendaPreset ?? ''),
          legendaTexto: String(p?.legendaTexto ?? ''),
        }))
      : []

    return {
      rep: obj.rep ?? '',
      re: obj.re ?? '',
      receivedAt: obj.receivedAt ?? '',
      origem: obj.origem ?? '',
      lacreRecebimento: obj.lacreRecebimento ?? '',

      cidadeIC: obj.cidadeIC ?? '',
      diretorIC: obj.diretorIC ?? '',
      cargoAutoridade: obj.cargoAutoridade ?? '',
      autoridadeRequisitante: obj.autoridadeRequisitante ?? '',
      delegaciaDestino: obj.delegaciaDestino ?? '',
      quesitacao: obj.quesitacao ?? '',

      peritoRelator: obj.peritoRelator ?? '(Perito do login)',

      objetivo: obj.objetivo ?? '',
      hasQuesitos: (obj.hasQuesitos as ReportDraft['hasQuesitos']) ?? '',

      quesitos: parsedQuesitos,

      peca_tipoLacre: obj.peca_tipoLacre ?? '',
      peca_tipoDispositivo: obj.peca_tipoDispositivo ?? '',

      peca_bateriaDescarregada: (obj.peca_bateriaDescarregada as any) ?? '',

      aparelho_marca: obj.aparelho_marca ?? '',
      aparelho_modelo: obj.aparelho_modelo ?? '',
      aparelho_cor: obj.aparelho_cor ?? '',
      aparelho_estadoUso: obj.aparelho_estadoUso ?? 'usado',
      aparelho_infoExternaPreset: obj.aparelho_infoExternaPreset ?? '',
      aparelho_infoExternaTexto: obj.aparelho_infoExternaTexto ?? '',

      gavetaImei_presente: (obj.gavetaImei_presente as any) ?? '',
      gavetaImei_valor: obj.gavetaImei_valor ?? '',

      acompanhava_bateria: (obj as any).acompanhava_bateria ?? '',

      sim,
      memory,

      particularidades: parsedPart,
      particularidadesOutras: obj.particularidadesOutras ?? '',

      photos: parsedPhotos,

      lacreSaida: (obj as any).lacreSaida ?? '',
      finalLocal: (obj as any).finalLocal ?? '',
      finalData: (obj as any).finalData ?? '',
    }
  } catch {
    return null
  }
}

function formatDateBR(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  const day = digits.slice(0, 2)
  const month = digits.slice(2, 4)
  const year = digits.slice(4, 8)

  let result = day
  if (month) result += '/' + month
  if (year) result += '/' + year
  return result
}

function buildPreambulo(r: ReportDraft): string {
  const data = r.receivedAt?.trim() || '[data de recebimento da peça]'
  const cidade = r.cidadeIC?.trim() || '[cidade do IC]'
  const diretor = r.diretorIC?.trim() || '[Diretor do IC]'
  const perito = r.peritoRelator?.trim() || '[Perito Relator]'
  const cargo = r.cargoAutoridade?.trim() || '[Cargo da Autoridade]'
  const autoridade = r.autoridadeRequisitante?.trim() || '[Autoridade]'
  const delegacia = r.delegaciaDestino?.trim() || '[Delegacia requisitante/Destino]'
  const origem = r.origem?.trim() || '[Origem]'

  return (
    `Aos ${data}, na cidade de ${cidade} e no INSTITUTO DE CRIMINALÍSTICA, da SPTC - Superintendência da Policia Técnico Científica, ` +
    `da Secretaria da Segurança Pública do Estado de São Paulo, de conformidade com o disposto no artigo 178 do Decreto-Lei nº3.689 de 3 de outubro de 1.941 ` +
    `e alterado pela Lei 11690 de 9 de junho de 2008, foi designado pelo Diretor deste Instituto ${diretor}, o Perito Criminal ${perito} ` +
    `para proceder ao exame supra especificado, em atendimento à requisição ${cargo} ${autoridade} da ${delegacia}, referente ao ${origem}.`
  )
}

function buildObjetivos(r: ReportDraft): string {
  const origem = r.origem?.trim() || '[origem]'
  const delegacia = r.delegaciaDestino?.trim() || '[Delegacia requisitante/Destino]'
  const re = r.re?.trim() || '[RE]'
  const objetivo = r.objetivo?.trim() || '[Objetivo]'

  return (
    `Conforme se depreende da leitura dos termos da requisição de exame pericial, relacionada ao ${origem} da ${delegacia}, ` +
    `registrada nessa equipe como ${re}, a presente perícia tem com o objetivo: ${objetivo}.`
  )
}

const PARTICULARIDADES_PRESETS = [
  'O dispositivo examinado veio ter com sua face anterior fraturada, porém, sem perda aparente de substância.',
  'O dispositivo examinado ter com sua face posterior fraturada, porém, sem perda aparente de substância.',
  'O dispositivo examinado veio ter com ausência da tampa de proteção traseira.',
  'O dispositivo examinado se encontrava com sua tela fraturada e com perda de substância.',
  'O dispositivo examinado veio ter com sua face posterior fraturada e com perda de substância.',
  'O dispositivo examinado se encontrava com danos em sua estrutura, sua tela fraturada e com perda de substância.',
  'O dispositivo examinado estava coberto por substância hematóide, que foi limpa para a realização do exame.',
  'Acompanhava o dispositivo uma capa protetora.',
] as const

const PHOTO_LEGEND_PRESETS = [
  'Vista geral do aparelho.',
  'Vista frontal do aparelho.',
  'Vista posterior do aparelho.',
  'Detalhe da tela do aparelho.',
  'Detalhe da parte posterior do aparelho.',
] as const

function buildQuesitosTexto(r: ReportDraft): string {
  if (r.hasQuesitos !== 'sim' || !r.quesitos || r.quesitos.length === 0) {
    return [
      'QUESITOS E RESPOSTAS',
      '',
      'Não foram apresentados quesitos específicos para esta perícia.',
    ].join('\n')
  }

  const linhas = r.quesitos.map((q, idx) => {
    const pergunta = q.pergunta.trim() || '[Pergunta não preenchida]'
    const resposta = q.resposta.trim() || '[Resposta não preenchida]'
    return `Quesito ${idx + 1}\nPergunta: ${pergunta}\nResposta: ${resposta}`
  })

  return ['QUESITOS E RESPOSTAS', ...linhas].join('\n\n')
}

function buildDescricaoCelular(r: ReportDraft): string {
  const tipoLacreRaw = r.peca_tipoLacre?.trim() || 'lacre não informado'
  const tipoDisp = r.peca_tipoDispositivo?.trim() || 'dispositivo não informado'
  const marca = r.aparelho_marca?.trim() || '[marca]'
  const modelo = r.aparelho_modelo?.trim() || '[modelo]'
  const cor = r.aparelho_cor?.trim() || '[cor]'
  const estado = r.aparelho_estadoUso?.trim() || '[estado]'

  const infoPreset = r.aparelho_infoExternaPreset?.trim() || '[informações impressas]'
  const infoTexto = r.aparelho_infoExternaTexto.trim()
  const infoExterna = infoTexto ? `${infoPreset} ${infoTexto}` : infoPreset

  const lacreNum = r.lacreRecebimento?.trim()
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
      : r.peca_bateriaDescarregada === 'nao'
      ? ''
      : ''

  const gavetaImei =
    r.gavetaImei_presente === 'sim'
      ? `Apresentava em sua gaveta para cartões o IMEI: ${r.gavetaImei_valor?.trim() || 'X'}.`
      : ''

  let simText = ''
  if (r.sim.mode === 'one_inside') {
    simText = `No interior de sua gaveta para cartões havia um cartão do tipo SIM, da operadora ${
      r.sim.operadora1 || 'Escolher um item.'
    } com ICCID ${r.sim.iccid1 || 'XXX'}.`
  } else if (r.sim.mode === 'two_inside') {
    simText =
      `No interior de sua gaveta para cartões havia dois cartões do tipo SIM, respectivamente inseridos como SIM 1 o cartão da operadora ${
        r.sim.operadora1 || 'Escolher um item.'
      } com ICCID ${r.sim.iccid1 || 'XXX'} ` +
      `e o SIM 2 o cartão da operadora ${r.sim.operadora2 || 'Escolher um item.'} com ICCID ${
        r.sim.iccid2 || 'XXX'
      }.`
  } else if (r.sim.mode === 'one_external') {
    simText = `Acompanhava externamente este aparelho um cartão do tipo SIM da operadora ${
      r.sim.operadora1 || 'Escolher um item.'
    } com ICCID ${r.sim.iccid1 || 'XXX'}.`
  } else if (r.sim.mode === 'two_external') {
    simText =
      `Acompanhava externamente este aparelho dois cartões do tipo SIM sendo um da operadora ${
        r.sim.operadora1 || 'Escolher um item.'
      } com ICCID ${r.sim.iccid1 || 'XXX'} ` +
      `e o outro da operadora ${r.sim.operadora2 || 'Escolher um item.'} com ICCID ${
        r.sim.iccid2 || 'XXX'
      }.`
  }

  let memText = ''
  if (r.memory.mode === 'inside') {
    memText =
      `No interior de sua gaveta para cartões havia um cartão do tipo micro SD, da marca ${
        r.memory.marca || 'Sandisk'
      }, ` +
      `com capacidade de armazenar ${r.memory.capacidadeGb || 'XX'} GB com número de série ${
        r.memory.serie || 'XXX'
      }.`
  } else if (r.memory.mode === 'external') {
    memText =
      `Acompanhava externamente este aparelho, um cartão de memória, do tipo micro SD, da marca ${
        r.memory.marca || 'Sandisk'
      }, ` +
      `com capacidade de armazenar ${r.memory.capacidadeGb || 'XX'} GB com número de série ${
        r.memory.serie || 'XXX'
      }.`
  }

  const parts = [...r.particularidades]
  const outras = r.particularidadesOutras.trim()
  if (outras) parts.push(outras)
  const partText = parts.length ? parts.join('\n') : ''

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

function buildRegistroFotografico(r: ReportDraft): string {
  if (!r.photos || r.photos.length === 0) {
    return 'REGISTRO FOTOGRÁFICO\n(Não há fotos registradas neste módulo.)'
  }

  const linhas = r.photos.map((p, idx) => {
    const base = p.legendaPreset?.trim() || ''
    const extra = p.legendaTexto?.trim() || ''
    const texto = [base, extra].filter(Boolean).join(' ')
    return `Figura ${idx + 1} – ${texto || 'Legenda não informada.'}`
  })

  return ['REGISTRO FOTOGRÁFICO', ...linhas].join('\n')
}

function buildFinalizacao(r: ReportDraft): string {
  const lacreSaida = r.lacreSaida.trim() || '[Lacre de saída]'
  const rep = r.rep.trim() || '[REP]'
  const local = r.finalLocal.trim() || r.cidadeIC.trim() || '[Local]'
  const data = r.finalData.trim() || '[Data]'
  const perito = r.peritoRelator.trim() || '[Nome do Perito]'

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

function buildLaudoCompleto(r: ReportDraft): string {
  const preambulo = buildPreambulo(r)
  const objetivos = buildObjetivos(r)
  const quesitos = buildQuesitosTexto(r)
  const descricao = buildDescricaoCelular(r)
  const fotos = buildRegistroFotografico(r)
  const finalizacao = buildFinalizacao(r)

  const header = [
    'LAUDO PERICIAL',
  ]

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

// >>> NOVO: estado inicial centralizado
function makeEmptyReport(): ReportDraft {
  return {
    rep: '',
    re: '',
    receivedAt: '',
    origem: '',
    lacreRecebimento: '',

    cidadeIC: '',
    diretorIC: '',
    cargoAutoridade: '',
    autoridadeRequisitante: '',
    delegaciaDestino: '',
    quesitacao: '',

    peritoRelator: '(Perito do login)',

    objetivo: '',
    hasQuesitos: '',

    quesitos: [],

    peca_tipoLacre: LOOKUPS.lacres[0],
    peca_tipoDispositivo: LOOKUPS.dispositivos[0],

    peca_bateriaDescarregada: '',

    aparelho_marca: '',
    aparelho_modelo: '',
    aparelho_cor: '',
    aparelho_estadoUso: 'usado',
    aparelho_infoExternaPreset: LOOKUPS.infosExternas[0],
    aparelho_infoExternaTexto: '',

    gavetaImei_presente: '',
    gavetaImei_valor: '',

    acompanhava_bateria: '',

    sim: { mode: 'none' },
    memory: { mode: 'none' },

    particularidades: [],
    particularidadesOutras: '',

    photos: [],

    lacreSaida: '',
    finalLocal: '',
    finalData: '',
  }
}

export default function NewReport() {
  const [step, setStep] = useState(0)

  const [report, setReport] = useState<ReportDraft>(makeEmptyReport())

  const [errors, setErrors] = useState<FieldErrors>({})
  const [quesitoErrors, setQuesitoErrors] = useState<
    Array<{ pergunta?: boolean; resposta?: boolean }>
  >([])

  const [custom, setCustom] = useState({
    cidadeIC: '',
    diretorIC: '',
    autoridadeRequisitante: '',
    delegaciaDestino: '',
  })

  const progressPct = useMemo(() => ((step + 1) / steps.length) * 100, [step])
  const preambuloText = useMemo(() => buildPreambulo(report), [report])
  const objetivosText = useMemo(() => buildObjetivos(report), [report])
  const descricaoText = useMemo(() => buildDescricaoCelular(report), [report])
  const registroFotograficoText = useMemo(() => buildRegistroFotografico(report), [report])
  const finalizacaoText = useMemo(() => buildFinalizacao(report), [report])
  const laudoCompletoText = useMemo(() => buildLaudoCompleto(report), [report])

  useEffect(() => {
    const draft = safeParseDraft(localStorage.getItem(STORAGE_KEY))
    if (draft) {
      setReport(draft)
      setQuesitoErrors(draft.quesitos.map(() => ({})))
    }
  }, [])

  useEffect(() => {
    const id = window.setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(report))
    }, 250)
    return () => window.clearTimeout(id)
  }, [report])

  function setField<K extends keyof ReportDraft>(key: K, value: ReportDraft[K]) {
    setReport((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: false }))
  }

  function validateStep0(): boolean {
    const next: FieldErrors = {
      rep: report.rep.trim() === '',
      re: report.re.trim() === '',
      receivedAt: report.receivedAt.trim() === '',
      origem: report.origem.trim() === '',
      lacreRecebimento: report.lacreRecebimento.trim() === '',
    }
    setErrors((prev) => ({ ...prev, ...next }))
    return !Object.values(next).some(Boolean)
  }

  function validateStep1(): boolean {
    const next: FieldErrors = {
      cidadeIC: report.cidadeIC.trim() === '',
      diretorIC: report.diretorIC.trim() === '',
      cargoAutoridade: report.cargoAutoridade.trim() === '',
      autoridadeRequisitante: report.autoridadeRequisitante.trim() === '',
      delegaciaDestino: report.delegaciaDestino.trim() === '',
    }
    setErrors((prev) => ({ ...prev, ...next }))
    return !Object.values(next).some(Boolean)
  }

  function validateStep3(): boolean {
    const next: FieldErrors = {
      objetivo: report.objetivo.trim() === '',
      hasQuesitos: report.hasQuesitos.trim() === '',
    }
    setErrors((prev) => ({ ...prev, ...next }))
    return !Object.values(next).some(Boolean)
  }

  function validateStep4Quesitos(): boolean {
    if (report.hasQuesitos !== 'sim') return true
    if (report.quesitos.length === 0) return false

    const nextErrors = report.quesitos.map((q) => ({
      pergunta: q.pergunta.trim() === '',
      resposta: q.resposta.trim() === '',
    }))

    setQuesitoErrors(nextErrors)
    return !nextErrors.some((e) => e.pergunta || e.resposta)
  }

  function onNext() {
    if (step === 0 && !validateStep0()) return
    if (step === 1 && !validateStep1()) return

    if (step === 3) {
      if (!validateStep3()) return
      if (report.hasQuesitos === 'nao') {
        setStep(5)
        return
      }
    }

    if (step === 4) {
      if (!validateStep4Quesitos()) return
    }

    setStep((s) => Math.min(s + 1, steps.length - 1))
  }

  function onBack() {
    if (step === 5 && report.hasQuesitos === 'nao') {
      setStep(3)
      return
    }
    setStep((s) => Math.max(s - 1, 0))
  }

  // >>> NOVO: reset total do laudo
  function resetReport() {
    localStorage.removeItem(STORAGE_KEY)
    setReport(makeEmptyReport())
    setErrors({})
    setQuesitoErrors([])
    setStep(0)
  }

  function renderSelectWithNew(args: {
    label: string
    field: keyof ReportDraft
    options: readonly string[]
    customKey?: keyof typeof custom
  }) {
    const { label, field, options, customKey } = args
    const value = report[field] as string
    const isInvalid = Boolean(errors[field])
    const isNew = value === '__new__'

    return (
      <div className="col-12 col-md-6">
        <label className="form-label">{label}</label>
        <select
          className={`form-select ${isInvalid ? 'is-invalid' : ''}`}
          value={value}
          onChange={(e) => setField(field, e.target.value as any)}
        >
          <option value="">— Selecionar —</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
          <option value="__new__">+ Novo (digitar)</option>
        </select>

        {customKey && isNew ? (
          <input
            className="form-control mt-2"
            value={custom[customKey]}
            onChange={(e) => setCustom((p) => ({ ...p, [customKey]: e.target.value }))}
            placeholder="Digite o novo valor"
            onBlur={() => {
              const typed = custom[customKey].trim()
              if (typed) setField(field, typed as any)
            }}
          />
        ) : null}
      </div>
    )
  }

  function addQuesito() {
    setReport((prev) => ({
      ...prev,
      quesitos: [...prev.quesitos, { pergunta: '', resposta: '' }],
    }))
    setQuesitoErrors((prev) => [...prev, {}])
  }

  function removeQuesito(index: number) {
    setReport((prev) => ({
      ...prev,
      quesitos: prev.quesitos.filter((_, i) => i !== index),
    }))
    setQuesitoErrors((prev) => prev.filter((_, i) => i !== index))
  }

  function setQuesitoField(index: number, key: keyof QuesitoItem, value: string) {
    setReport((prev) => {
      const next = [...prev.quesitos]
      next[index] = { ...next[index], [key]: value }
      return { ...prev, quesitos: next }
    })
    setQuesitoErrors((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [key]: false }
      return next
    })
  }

  function toggleParticularidade(texto: string) {
    setReport((prev) => {
      const has = prev.particularidades.includes(texto)
      const next = has
        ? prev.particularidades.filter((x) => x !== texto)
        : [...prev.particularidades, texto]
      return { ...prev, particularidades: next }
    })
  }

  function addPhoto() {
    setReport((prev) => ({
      ...prev,
      photos: [
        ...prev.photos,
        {
          id: prev.photos.length ? prev.photos[prev.photos.length - 1].id + 1 : 1,
          legendaPreset: PHOTO_LEGEND_PRESETS[0],
          legendaTexto: '',
        },
      ],
    }))
  }

  function updatePhoto(index: number, key: 'legendaPreset' | 'legendaTexto', value: string) {
    setReport((prev) => {
      const next = [...prev.photos]
      const current = next[index]
      if (!current) return prev
      next[index] = { ...current, [key]: value }
      return { ...prev, photos: next }
    })
  }

  function removePhoto(index: number) {
    setReport((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }))
  }

  async function handleDownloadDOCX() {
    try {
      const response = await fetch('http://localhost:3001/api/laudos/celular/docx', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ report }),
      })

      if (!response.ok) {
        throw new Error('Falha na resposta do servidor.')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${report.rep || 'laudo_celular'}.docx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
      window.alert('Erro ao gerar o DOCX no servidor.')
    }
  }


  return (
    <div className="container py-4">
      <div className="card shadow-sm">
        <div className="card-body">
          <div className="progress mb-3">
            <div className="progress-bar" style={{ width: `${progressPct}%` }} />
          </div>

          <h2 className="h6 mb-4">{steps[step]}</h2>

          {step === 0 ? (
            <div className="row g-3">
              <div className="col-12 col-md-4">
                <label className="form-label">REP / Número do laudo</label>
                <input
                  className={`form-control ${errors.rep ? 'is-invalid' : ''}`}
                  value={report.rep}
                  onChange={(e) => setField('rep', e.target.value)}
                />
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label">RE</label>
                <input
                  className={`form-control ${errors.re ? 'is-invalid' : ''}`}
                  value={report.re}
                  onChange={(e) => setField('re', e.target.value)}
                />
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label">Data de recebimento da peça</label>
                <input
                  className={`form-control ${errors.receivedAt ? 'is-invalid' : ''}`}
                  value={report.receivedAt}
                  onChange={(e) => setField('receivedAt', formatDateBR(e.target.value))}
                  placeholder="dd/mm/aaaa"
                  inputMode="numeric"
                />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label">Origem (B.O., IP, Ofício)</label>
                <input
                  className={`form-control ${errors.origem ? 'is-invalid' : ''}`}
                  value={report.origem}
                  onChange={(e) => setField('origem', e.target.value)}
                />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label">Lacre de recebimento</label>
                <input
                  className={`form-control ${errors.lacreRecebimento ? 'is-invalid' : ''}`}
                  value={report.lacreRecebimento}
                  onChange={(e) => setField('lacreRecebimento', e.target.value)}
                />
              </div>
            </div>
          ) : step === 1 ? (
            <div className="row g-3">
              {renderSelectWithNew({
                label: 'Cidade do IC',
                field: 'cidadeIC',
                options: LOOKUPS.cidadesIC,
                customKey: 'cidadeIC',
              })}
              {renderSelectWithNew({
                label: 'Diretor do IC',
                field: 'diretorIC',
                options: LOOKUPS.diretoresIC,
                customKey: 'diretorIC',
              })}

              <div className="col-12 col-md-6">
                <label className="form-label">Perito relator (do login)</label>
                <input className="form-control" value={report.peritoRelator} disabled />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label">Cargo da Autoridade</label>
                <select
                  className={`form-select ${errors.cargoAutoridade ? 'is-invalid' : ''}`}
                  value={report.cargoAutoridade}
                  onChange={(e) => setField('cargoAutoridade', e.target.value)}
                >
                  <option value="">— Selecionar —</option>
                  {LOOKUPS.cargosAutoridade.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {renderSelectWithNew({
                label: 'Autoridade requisitante',
                field: 'autoridadeRequisitante',
                options: LOOKUPS.autoridades,
                customKey: 'autoridadeRequisitante',
              })}
              {renderSelectWithNew({
                label: 'Delegacia de destino',
                field: 'delegaciaDestino',
                options: LOOKUPS.delegacias,
                customKey: 'delegaciaDestino',
              })}

              <div className="col-12">
                <label className="form-label">Quesitação (copiar os quesitos da requisição)</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={report.quesitacao}
                  onChange={(e) => setField('quesitacao', e.target.value)}
                />
              </div>
            </div>
          ) : step === 2 ? (
            <div className="alert alert-secondary" style={{ whiteSpace: 'pre-wrap' }}>
              <div className="fw-semibold mb-2">Texto do Preâmbulo (automático)</div>
              {preambuloText}
            </div>
          ) : step === 3 ? (
            <div className="row g-3">
              <div className="col-12">
                <div className="alert alert-secondary mb-0">
                  <div className="fw-semibold mb-2">Texto de Objetivos (automático)</div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{objetivosText}</div>
                </div>
              </div>

              <div className="col-12">
                <label className="form-label">Objetivo (copiar da requisição)</label>
                <textarea
                  className={`form-control ${errors.objetivo ? 'is-invalid' : ''}`}
                  rows={3}
                  value={report.objetivo}
                  onChange={(e) => setField('objetivo', e.target.value)}
                />
              </div>

              <div className="col-12">
                <label className="form-label">Existem quesitos para a perícia?</label>
                <div className={`p-3 rounded border ${errors.hasQuesitos ? 'border-danger' : ''}`}>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="hasQuesitos"
                      id="hasQuesitosSim"
                      checked={report.hasQuesitos === 'sim'}
                      onChange={() => setField('hasQuesitos', 'sim')}
                    />
                    <label className="form-check-label" htmlFor="hasQuesitosSim">
                      Sim
                    </label>
                  </div>

                  <div className="form-check mt-2">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="hasQuesitos"
                      id="hasQuesitosNao"
                      checked={report.hasQuesitos === 'nao'}
                      onChange={() => setField('hasQuesitos', 'nao')}
                    />
                    <label className="form-check-label" htmlFor="hasQuesitosNao">
                      Não
                    </label>
                  </div>
                </div>
              </div>
            </div>
          ) : step === 4 ? (
            <div>
              {report.hasQuesitos !== 'sim' ? (
                <div className="alert alert-secondary">
                  Você marcou que não há quesitos. Este capítulo será pulado.
                </div>
              ) : (
                <>
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <div className="fw-semibold">Quesitos e suas respostas</div>
                    <button className="btn btn-outline-primary btn-sm" onClick={addQuesito}>
                      + Adicionar quesito
                    </button>
                  </div>

                  {report.quesitos.length === 0 ? (
                    <div className="alert alert-warning mb-0">
                      Adicione ao menos 1 quesito para avançar.
                    </div>
                  ) : (
                    <div className="d-flex flex-column gap-3">
                      {report.quesitos.map((q, idx) => (
                        <div className="card" key={idx}>
                          <div className="card-body">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <div className="fw-semibold">Quesito {idx + 1}</div>
                              <button
                                className="btn btn-outline-danger btn-sm"
                                onClick={() => removeQuesito(idx)}
                              >
                                Remover
                              </button>
                            </div>

                            <label className="form-label">Pergunta</label>
                            <textarea
                              className={`form-control ${
                                quesitoErrors[idx]?.pergunta ? 'is-invalid' : ''
                              }`}
                              rows={2}
                              value={q.pergunta}
                              onChange={(e) => setQuesitoField(idx, 'pergunta', e.target.value)}
                            />

                            <label className="form-label mt-3">Resposta</label>
                            <textarea
                              className={`form-control ${
                                quesitoErrors[idx]?.resposta ? 'is-invalid' : ''
                              }`}
                              rows={3}
                              value={q.resposta}
                              onChange={(e) => setQuesitoField(idx, 'resposta', e.target.value)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : step === 5 ? (
            <div className="row g-3">
              <div className="col-12">
                <div className="alert alert-secondary mb-0">
                  <div className="fw-semibold mb-2">Prévia do texto (automático)</div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{descricaoText}</div>
                </div>
              </div>

              <div className="col-12">
                <div className="fw-semibold">DA PEÇA</div>
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label">Tipo de lacre</label>
                <select
                  className="form-select"
                  value={report.peca_tipoLacre}
                  onChange={(e) => setField('peca_tipoLacre', e.target.value)}
                >
                  {LOOKUPS.lacres.map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label">Dispositivo</label>
                <select
                  className="form-select"
                  value={report.peca_tipoDispositivo}
                  onChange={(e) => setField('peca_tipoDispositivo', e.target.value)}
                >
                  {LOOKUPS.dispositivos.map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label">Marca</label>
                <select
                  className="form-select"
                  value={report.aparelho_marca}
                  onChange={(e) => setField('aparelho_marca', e.target.value)}
                >
                  <option value="">— Selecionar —</option>
                  {LOOKUPS.marcas.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label">Modelo</label>
                <input
                  className="form-control"
                  value={report.aparelho_modelo}
                  onChange={(e) => setField('aparelho_modelo', e.target.value)}
                />
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label">Cor</label>
                <select
                  className="form-select"
                  value={report.aparelho_cor}
                  onChange={(e) => setField('aparelho_cor', e.target.value)}
                >
                  <option value="">— Selecionar —</option>
                  {LOOKUPS.cores.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label">Estado</label>
                <select
                  className="form-select"
                  value={report.aparelho_estadoUso}
                  onChange={(e) => setField('aparelho_estadoUso', e.target.value)}
                >
                  <option value="">— Selecionar —</option>
                  <option value="usado">Usado</option>
                  <option value="novo">Novo</option>
                </select>
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label">Informações impressas externamente</label>
                <select
                  className="form-select"
                  value={report.aparelho_infoExternaPreset}
                  onChange={(e) => setField('aparelho_infoExternaPreset', e.target.value)}
                >
                  <option value="">— Selecionar —</option>
                  {LOOKUPS.infosExternas.map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-12">
                <label className="form-label">
                  Complemento das informações externas (opcional)
                </label>
                <input
                  className="form-control"
                  value={report.aparelho_infoExternaTexto}
                  onChange={(e) => setField('aparelho_infoExternaTexto', e.target.value)}
                  placeholder="Ex.: IMEI impresso, número de série, inscrições..."
                />
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label">Apresentava IMEI na gaveta?</label>
                <select
                  className="form-select"
                  value={report.gavetaImei_presente}
                  onChange={(e) => setField('gavetaImei_presente', e.target.value as any)}
                >
                  <option value="">— Não informado —</option>
                  <option value="sim">Sim</option>
                  <option value="nao">Não</option>
                </select>
              </div>

              <div className="col-12 col-md-8">
                <label className="form-label">IMEI da gaveta (se Sim)</label>
                <input
                  className="form-control"
                  value={report.gavetaImei_valor}
                  onChange={(e) => setField('gavetaImei_valor', e.target.value)}
                  disabled={report.gavetaImei_presente !== 'sim'}
                />
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label">Acompanhava bateria?</label>
                <select
                  className="form-select"
                  value={report.acompanhava_bateria}
                  onChange={(e) =>
                    setField('acompanhava_bateria', e.target.value as '' | 'sim' | 'nao')
                  }
                >
                  <option value="">— Não informado —</option>
                  <option value="nao">Não acompanhava bateria</option>
                  <option value="sim">Acompanhava sua bateria</option>
                </select>
              </div>

              <div className="col-12">
                <hr />
                <div className="fw-semibold">SIM CARD</div>
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label">Configuração</label>
                <select
                  className="form-select"
                  value={report.sim.mode}
                  onChange={(e) => {
                    const mode = e.target.value as SimConfig['mode']
                    if (mode === 'none') setField('sim', { mode: 'none' })
                    if (mode === 'one_inside')
                      setField('sim', { mode: 'one_inside', operadora1: '', iccid1: '' })
                    if (mode === 'two_inside')
                      setField('sim', {
                        mode: 'two_inside',
                        operadora1: '',
                        iccid1: '',
                        operadora2: '',
                        iccid2: '',
                      })
                    if (mode === 'one_external')
                      setField('sim', { mode: 'one_external', operadora1: '', iccid1: '' })
                    if (mode === 'two_external')
                      setField('sim', {
                        mode: 'two_external',
                        operadora1: '',
                        iccid1: '',
                        operadora2: '',
                        iccid2: '',
                      })
                  }}
                >
                  <option value="none">Não se aplica</option>
                  <option value="one_inside">1 SIM no interior</option>
                  <option value="two_inside">2 SIM no interior</option>
                  <option value="one_external">1 SIM externo</option>
                  <option value="two_external">2 SIM externos</option>
                </select>
              </div>

              {report.sim.mode !== 'none' && (
                <>
                  <div className="col-12 col-md-3">
                    <label className="form-label">Operadora (SIM 1)</label>
                    <select
                      className="form-select"
                      value={(report.sim as any).operadora1 ?? ''}
                      onChange={(e) =>
                        setField('sim', { ...(report.sim as any), operadora1: e.target.value })
                      }
                    >
                      <option value="">— Selecionar —</option>
                      {LOOKUPS.operadoras.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12 col-md-3">
                    <label className="form-label">ICCID (SIM 1)</label>
                    <input
                      className="form-control"
                      value={(report.sim as any).iccid1 ?? ''}
                      onChange={(e) =>
                        setField('sim', { ...(report.sim as any), iccid1: e.target.value })
                      }
                    />
                  </div>

                  {(report.sim.mode === 'two_inside' || report.sim.mode === 'two_external') && (
                    <>
                      <div className="col-12 col-md-3">
                        <label className="form-label">Operadora (SIM 2)</label>
                        <select
                          className="form-select"
                          value={(report.sim as any).operadora2 ?? ''}
                          onChange={(e) =>
                            setField('sim', {
                              ...(report.sim as any),
                              operadora2: e.target.value,
                            })
                          }
                        >
                          <option value="">— Selecionar —</option>
                          {LOOKUPS.operadoras.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-12 col-md-3">
                        <label className="form-label">ICCID (SIM 2)</label>
                        <input
                          className="form-control"
                          value={(report.sim as any).iccid2 ?? ''}
                          onChange={(e) =>
                            setField('sim', { ...(report.sim as any), iccid2: e.target.value })
                          }
                        />
                      </div>
                    </>
                  )}
                </>
              )}

              <div className="col-12">
                <hr />
                <div className="fw-semibold">MEMORY CARD</div>
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label">Configuração</label>
                <select
                  className="form-select"
                  value={report.memory.mode}
                  onChange={(e) => {
                    const mode = e.target.value as MemoryConfig['mode']
                    if (mode === 'none') setField('memory', { mode: 'none' })
                    if (mode === 'inside')
                      setField('memory', {
                        mode: 'inside',
                        marca: 'Sandisk',
                        capacidadeGb: '',
                        serie: '',
                      })
                    if (mode === 'external')
                      setField('memory', {
                        mode: 'external',
                        marca: 'Sandisk',
                        capacidadeGb: '',
                        serie: '',
                      })
                  }}
                >
                  <option value="none">Não se aplica</option>
                  <option value="inside">Micro SD no interior</option>
                  <option value="external">Micro SD externo</option>
                </select>
              </div>

              {report.memory.mode !== 'none' && (
                <>
                  <div className="col-12 col-md-2">
                    <label className="form-label">Marca</label>
                    <input
                      className="form-control"
                      value={(report.memory as any).marca ?? ''}
                      onChange={(e) =>
                        setField('memory', { ...(report.memory as any), marca: e.target.value })
                      }
                    />
                  </div>
                  <div className="col-12 col-md-2">
                    <label className="form-label">Capacidade (GB)</label>
                    <input
                      className="form-control"
                      value={(report.memory as any).capacidadeGb ?? ''}
                      onChange={(e) =>
                        setField('memory', {
                          ...(report.memory as any),
                          capacidadeGb: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="col-12 col-md-2">
                    <label className="form-label">Nº de série</label>
                    <input
                      className="form-control"
                      value={(report.memory as any).serie ?? ''}
                      onChange={(e) =>
                        setField('memory', { ...(report.memory as any), serie: e.target.value })
                      }
                    />
                  </div>
                </>
              )}

              <div className="col-12">
                <hr />
                <div className="fw-semibold">PARTICULARIDADES</div>
                <div className="text-muted small">Marque as opções aplicáveis.</div>
              </div>

              <div className="col-12">
                <div className="row g-2">
                  {PARTICULARIDADES_PRESETS.map((p) => (
                    <div className="col-12 col-md-6" key={p}>
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={report.particularidades.includes(p)}
                          onChange={() => toggleParticularidade(p)}
                          id={p}
                        />
                        <label className="form-check-label" htmlFor={p}>
                          {p}
                        </label>
                      </div>
                    </div>
                  ))}
                </div>

                <label className="form-label mt-3">Outras particularidades (opcional)</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={report.particularidadesOutras}
                  onChange={(e) => setField('particularidadesOutras', e.target.value)}
                />
              </div>
            </div>
          ) : step === 6 ? (
            <div className="row g-3">
              <div className="col-12">
                <div className="alert alert-secondary mb-3">
                  <div className="fw-semibold mb-2">Texto do Registro fotográfico (automático)</div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{registroFotograficoText}</div>
                </div>
              </div>

              <div className="col-12 d-flex justify-content-between align-items-center mb-2">
                <div className="fw-semibold">Registro fotográfico</div>
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm"
                  onClick={addPhoto}
                >
                  + Adicionar foto
                </button>
              </div>

              {report.photos.length === 0 ? (
                <div className="col-12">
                  <div className="alert alert-warning mb-0">
                    Nenhuma foto cadastrada neste módulo. O capítulo ficará apenas com o título.
                  </div>
                </div>
              ) : (
                report.photos.map((foto, idx) => (
                  <div className="col-12" key={foto.id}>
                    <div className="card">
                      <div className="card-body">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <div className="fw-semibold">Foto {idx + 1}</div>
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => removePhoto(idx)}
                          >
                            Remover
                          </button>
                        </div>

                        <div className="row g-2">
                          <div className="col-12 col-md-6">
                            <label className="form-label">Modelo de legenda</label>
                            <select
                              className="form-select"
                              value={foto.legendaPreset}
                              onChange={(e) =>
                                updatePhoto(idx, 'legendaPreset', e.target.value)
                              }
                            >
                              {PHOTO_LEGEND_PRESETS.map((p) => (
                                <option key={p} value={p}>
                                  {p}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="col-12 col-md-6">
                            <label className="form-label">Complemento (opcional)</label>
                            <input
                              className="form-control"
                              value={foto.legendaTexto}
                              onChange={(e) =>
                                updatePhoto(idx, 'legendaTexto', e.target.value)
                              }
                              placeholder="Ex.: realçando detalhe específico da imagem..."
                            />
                          </div>
                        </div>

                        <div className="mt-3 text-muted small">
                          Prévia: Figura {idx + 1} – {foto.legendaPreset} {foto.legendaTexto}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : step === 7 ? (
            <div className="row g-3">
              <div className="col-12">
                <div className="alert alert-secondary mb-3">
                  <div className="fw-semibold mb-2">Texto de finalização (automático)</div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{finalizacaoText}</div>
                </div>
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label">Lacre de saída SPTC</label>
                <input
                  className="form-control"
                  value={report.lacreSaida}
                  onChange={(e) => setField('lacreSaida', e.target.value)}
                  placeholder="Ex.: 1234567"
                />
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label">Local (cidade)</label>
                <input
                  className="form-control"
                  value={report.finalLocal}
                  onChange={(e) => setField('finalLocal', e.target.value)}
                  placeholder={report.cidadeIC || 'Cidade'}
                />
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label">Data do laudo</label>
                <input
                  className="form-control"
                  value={report.finalData}
                  onChange={(e) => setField('finalData', formatDateBR(e.target.value))}
                  placeholder="dd/mm/aaaa"
                  inputMode="numeric"
                />
              </div>
            </div>
                    ) : step === 8 ? (
            <div className="row g-3">
              <div className="col-12">
                <div className="alert alert-secondary mb-3">
                  <div className="fw-semibold mb-2">Prévia consolidada do laudo</div>
                  <div
                    style={{
                      whiteSpace: 'pre-wrap',
                      maxHeight: 400,
                      overflowY: 'auto',
                    }}
                  >
                    {laudoCompletoText}
                  </div>
                </div>
              </div>

              <div className="col-12 d-flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-outline-primary"
                  onClick={() => {
                    if (navigator && 'clipboard' in navigator) {
                      ;(navigator as any).clipboard
                        .writeText(laudoCompletoText)
                        .then(() =>
                          window.alert(
                            'Texto completo copiado para a área de transferência.',
                          ),
                        )
                        .catch(() =>
                          window.alert('Não foi possível copiar o texto.'),
                        )
                    } else {
                      window.alert(
                        'Recurso de cópia não disponível neste navegador.',
                      )
                    }
                  }}
                >
                  Copiar texto completo
                </button>

                <button
                  type="button"
                  className="btn btn-outline-primary"
                  onClick={handleDownloadDOCX}
                >
                  Baixar DOCX 
                </button>

                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  disabled
                >
                  Baixar PDF (em desenvolvimento)
                </button>
              </div>

              <div className="col-12">
                <div className="alert alert-info mt-3 mb-0">
                  Para uso imediato, copie o texto e cole no seu modelo oficial de laudo em
                  DOCX.
                </div>
              </div>
            </div>
          ) : null}
 

          <div className="d-flex justify-content-between mt-4">
            <button className="btn btn-outline-secondary" disabled={step === 0} onClick={onBack}>
              Voltar
            </button>
            <button
              className="btn btn-primary"
              disabled={step === steps.length - 1}
              onClick={onNext}
            >
              Salvar e avançar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
