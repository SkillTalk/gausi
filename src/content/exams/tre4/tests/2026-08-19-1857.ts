import type { ExamTest } from '@/types/exam';
import { tre4ExamConfig } from '../config';

const test: ExamTest = {
  id: 'tre4-2026-08-19-1857',
  slug: '2026-08-19-1857',
  date: '2026-08-19',
  title: 'Revolt of 1857',
  titleHi: '1857 का विद्रोह',
  subject: 'History',
  subjectHi: 'इतिहास',
  topicId: 'revolt-1857',
  difficulty: 'Beginner',
  description:
    'Practice 25 beginner-friendly Revolt of 1857 MCQs for BPSC TRE 4 in Hindi or English with a 15-minute timer and answer explanations.',
  config: {
    ...tre4ExamConfig,
    totalQuestions: 25,
    durationMinutes: 15,
  },
  questions: [
    {
      id: '1857-001',
      category: 'Important Dates',
      hi: {
        question: '1857 के विद्रोह की शुरुआत मेरठ में किस तारीख को हुई थी?',
        options: {
          A: '10 मई 1857',
          B: '29 मार्च 1857',
          C: '11 मई 1857',
          D: '1 जून 1857',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          '10 मई 1857 को मेरठ में भारतीय सिपाहियों ने विद्रोह किया। अगले दिन 11 मई को विद्रोही दिल्ली पहुँचे।',
      },
      en: {
        question: 'On which date did the Revolt of 1857 begin in Meerut?',
        options: {
          A: '10 May 1857',
          B: '29 March 1857',
          C: '11 May 1857',
          D: '1 June 1857',
          E: 'I do not want to answer',
        },
        explanation:
          'Indian soldiers revolted in Meerut on 10 May 1857. The rebels reached Delhi the next day, 11 May.',
      },
      correctOption: 'A',
    },
    {
      id: '1857-002',
      category: 'Leaders',
      hi: {
        question: 'मंगल पांडे ने 29 मार्च 1857 को किस छावनी में विद्रोह किया था?',
        options: {
          A: 'मेरठ',
          B: 'दिल्ली',
          C: 'बैरकपुर',
          D: 'कानपुर',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          'मंगल पांडे ने 29 मार्च 1857 को बैरकपुर छावनी (कलकत्ता के पास) में विद्रोह किया। उन्हें 8 अप्रैल 1857 को फाँसी दी गई।',
      },
      en: {
        question: 'At which cantonment did Mangal Pandey revolt on 29 March 1857?',
        options: {
          A: 'Meerut',
          B: 'Delhi',
          C: 'Barrackpore',
          D: 'Kanpur',
          E: 'I do not want to answer',
        },
        explanation:
          'Mangal Pandey revolted at Barrackpore cantonment (near Calcutta) on 29 March 1857. He was hanged on 8 April 1857.',
      },
      correctOption: 'C',
    },
    {
      id: '1857-003',
      category: 'Causes',
      hi: {
        question:
          '1857 के विद्रोह का तात्कालिक कारण क्या था जो चर्बी वाले कारतूसों से जुड़ा था?',
        options: {
          A: 'एनफ़ील्ड राइफ़ल के कारतूसों में गाय और सूअर की चर्बी का उपयोग',
          B: 'नई वर्दी पहनने का आदेश',
          C: 'अंग्रेज़ों द्वारा वेतन में कटौती',
          D: 'हिंदू सैनिकों को पूर्वी देशों में भेजना',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          'एनफ़ील्ड राइफ़ल के कारतूसों को मुँह से काटना पड़ता था। इनमें गाय और सूअर की चर्बी होने की अफ़वाह ने हिंदू और मुस्लिम सैनिकों को भड़का दिया।',
      },
      en: {
        question:
          'What was the immediate cause of the 1857 Revolt related to greased cartridges?',
        options: {
          A: 'Enfield rifle cartridges rumoured to be greased with cow and pig fat',
          B: 'Order to wear a new uniform',
          C: 'Pay cuts by the British',
          D: 'Sending Hindu soldiers to eastern countries',
          E: 'I do not want to answer',
        },
        explanation:
          'Soldiers had to bite off the top of Enfield rifle cartridges. Rumours that these were greased with cow and pig fat outraged both Hindu and Muslim soldiers.',
      },
      correctOption: 'A',
    },
    {
      id: '1857-004',
      category: 'Leaders',
      hi: {
        question: '1857 के विद्रोह में दिल्ली के मुग़ल सम्राट के रूप में किसे विद्रोहियों का नेता बनाया गया?',
        options: {
          A: 'शाह आलम II',
          B: 'बहादुर शाह ज़फर',
          C: 'अकबर II',
          D: 'सिराजुद्दौला',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          'मेरठ से आए विद्रोही सैनिकों ने बहादुर शाह ज़फर (अंतिम मुग़ल सम्राट) को 1857 के विद्रोह का नेता घोषित किया।',
      },
      en: {
        question: 'Who among the Mughal emperors of Delhi was declared the leader of the 1857 rebels?',
        options: {
          A: 'Shah Alam II',
          B: 'Bahadur Shah Zafar',
          C: 'Akbar II',
          D: 'Sirajuddaula',
          E: 'I do not want to answer',
        },
        explanation:
          'The rebel soldiers who arrived from Meerut declared Bahadur Shah Zafar (the last Mughal emperor) the leader of the 1857 Revolt.',
      },
      correctOption: 'B',
    },
    {
      id: '1857-005',
      category: 'Leaders',
      hi: {
        question: 'कानपुर में 1857 के विद्रोह का नेतृत्व किसने किया था?',
        options: {
          A: 'तात्या टोपे',
          B: 'नाना साहब',
          C: 'बेगम हज़रत महल',
          D: 'कुँवर सिंह',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          'नाना साहब (पेशवा बाजीराव II के दत्तक पुत्र) ने कानपुर में 1857 के विद्रोह का नेतृत्व किया था।',
      },
      en: {
        question: 'Who led the 1857 Revolt in Kanpur?',
        options: {
          A: 'Tatya Tope',
          B: 'Nana Saheb',
          C: 'Begum Hazrat Mahal',
          D: 'Kunwar Singh',
          E: 'I do not want to answer',
        },
        explanation:
          'Nana Saheb (the adopted son of Peshwa Baji Rao II) led the 1857 Revolt in Kanpur.',
      },
      correctOption: 'B',
    },
    {
      id: '1857-006',
      category: 'Leaders',
      hi: {
        question: 'लखनऊ में 1857 के विद्रोह का नेतृत्व किसने किया था?',
        options: {
          A: 'रानी लक्ष्मीबाई',
          B: 'तात्या टोपे',
          C: 'बेगम हज़रत महल',
          D: 'नाना साहब',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          'बेगम हज़रत महल (अवध के नवाब वाजिद अली शाह की पत्नी) ने लखनऊ में 1857 के विद्रोह का नेतृत्व किया।',
      },
      en: {
        question: 'Who led the 1857 Revolt in Lucknow?',
        options: {
          A: 'Rani Lakshmibai',
          B: 'Tatya Tope',
          C: 'Begum Hazrat Mahal',
          D: 'Nana Saheb',
          E: 'I do not want to answer',
        },
        explanation:
          'Begum Hazrat Mahal (wife of Nawab Wajid Ali Shah of Awadh) led the 1857 Revolt in Lucknow.',
      },
      correctOption: 'C',
    },
    {
      id: '1857-007',
      category: 'Leaders',
      hi: {
        question: '1857 के विद्रोह में झाँसी की रानी के रूप में किसने अंग्रेज़ों से लड़ाई लड़ी?',
        options: {
          A: 'रानी चेनम्मा',
          B: 'रानी लक्ष्मीबाई',
          C: 'बेगम हज़रत महल',
          D: 'अहिल्याबाई होल्कर',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          'रानी लक्ष्मीबाई, झाँसी की रानी, ने 1857 के विद्रोह में अंग्रेज़ों के विरुद्ध वीरतापूर्वक लड़ाई लड़ी। वे 18 जून 1858 को ग्वालियर के पास शहीद हुईं।',
      },
      en: {
        question: 'Who fought the British as the Queen of Jhansi in the 1857 Revolt?',
        options: {
          A: 'Rani Chennamma',
          B: 'Rani Lakshmibai',
          C: 'Begum Hazrat Mahal',
          D: 'Ahilyabai Holkar',
          E: 'I do not want to answer',
        },
        explanation:
          'Rani Lakshmibai, the Queen of Jhansi, fought bravely against the British in the 1857 Revolt. She was martyred near Gwalior on 18 June 1858.',
      },
      correctOption: 'B',
    },
    {
      id: '1857-008',
      category: 'Leaders',
      hi: {
        question: 'बिहार के आरा में 1857 के विद्रोह का नेतृत्व किसने किया था?',
        options: {
          A: 'तात्या टोपे',
          B: 'नाना साहब',
          C: 'कुँवर सिंह',
          D: 'मंगल पांडे',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          'कुँवर सिंह (जगदीशपुर के ज़मींदार) ने बिहार के आरा में 1857 के विद्रोह का नेतृत्व किया। वे 80 वर्ष की आयु में भी अंग्रेज़ों से लड़े।',
      },
      en: {
        question: 'Who led the 1857 Revolt in Arrah, Bihar?',
        options: {
          A: 'Tatya Tope',
          B: 'Nana Saheb',
          C: 'Kunwar Singh',
          D: 'Mangal Pandey',
          E: 'I do not want to answer',
        },
        explanation:
          'Kunwar Singh (the zamindar of Jagdishpur) led the 1857 Revolt in Arrah, Bihar. He fought the British even at the age of 80.',
      },
      correctOption: 'C',
    },
    {
      id: '1857-009',
      category: 'Leaders',
      hi: {
        question: 'तात्या टोपे का वास्तविक नाम क्या था?',
        options: {
          A: 'रामचंद्र पांडुरंग',
          B: 'गोपाल कृष्ण',
          C: 'विष्णु भट्ट',
          D: 'दामोदर राव',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          'तात्या टोपे का वास्तविक नाम रामचंद्र पांडुरंग था। वे नाना साहब के विश्वस्त सहयोगी और 1857 के विद्रोह के प्रमुख सैन्य नेता थे।',
      },
      en: {
        question: "What was Tatya Tope's real name?",
        options: {
          A: 'Ramchandra Pandurang',
          B: 'Gopal Krishna',
          C: 'Vishnu Bhatt',
          D: 'Damodar Rao',
          E: 'I do not want to answer',
        },
        explanation:
          "Tatya Tope's real name was Ramchandra Pandurang. He was a trusted aide of Nana Saheb and a key military leader of the 1857 Revolt.",
      },
      correctOption: 'A',
    },
    {
      id: '1857-010',
      category: 'Causes',
      hi: {
        question: 'डलहौज़ी की "व्यपगत नीति" (Doctrine of Lapse) के तहत किसका राज्य हड़पा गया जिससे 1857 में नाना साहब ने विद्रोह किया?',
        options: {
          A: 'अवध',
          B: 'झाँसी',
          C: 'पेशवाई (मराठा पेशवा)',
          D: 'नागपुर',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          'पेशवा बाजीराव II की मृत्यु के बाद अंग्रेज़ों ने व्यपगत नीति के तहत उनके दत्तक पुत्र नाना साहब की पेंशन और अधिकार समाप्त कर दिए, जिससे नाना साहब ने 1857 में विद्रोह किया।',
      },
      en: {
        question:
          "Under Dalhousie's Doctrine of Lapse, whose kingdom was annexed, leading Nana Saheb to revolt in 1857?",
        options: {
          A: 'Awadh',
          B: 'Jhansi',
          C: 'Peshwaship (Maratha Peshwa)',
          D: 'Nagpur',
          E: 'I do not want to answer',
        },
        explanation:
          "After Peshwa Baji Rao II's death, the British under the Doctrine of Lapse denied Nana Saheb (his adopted son) his pension and rights, prompting him to revolt in 1857.",
      },
      correctOption: 'C',
    },
    {
      id: '1857-011',
      category: 'Major Centres',
      hi: {
        question: '1857 के विद्रोह में अवध की राजधानी किस शहर में थी?',
        options: {
          A: 'इलाहाबाद',
          B: 'वाराणसी',
          C: 'लखनऊ',
          D: 'आगरा',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          'लखनऊ अवध की राजधानी थी। यहाँ बेगम हज़रत महल ने विद्रोह का नेतृत्व किया। अंग्रेज़ रेज़िडेंसी की घेराबंदी 1857 का एक प्रमुख प्रसंग है।',
      },
      en: {
        question: 'Which city was the capital of Awadh during the 1857 Revolt?',
        options: {
          A: 'Allahabad',
          B: 'Varanasi',
          C: 'Lucknow',
          D: 'Agra',
          E: 'I do not want to answer',
        },
        explanation:
          'Lucknow was the capital of Awadh. Begum Hazrat Mahal led the revolt here. The siege of the British Residency in Lucknow is a major episode of 1857.',
      },
      correctOption: 'C',
    },
    {
      id: '1857-012',
      category: 'Causes',
      hi: {
        question: 'अंग्रेज़ों ने 1856 में किस नीति के तहत अवध का विलय किया था, जो 1857 के विद्रोह का एक कारण बना?',
        options: {
          A: 'कुशासन का आरोप लगाकर',
          B: 'व्यपगत नीति',
          C: 'सहायक संधि',
          D: 'युद्ध में हार',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          '1856 में लॉर्ड डलहौज़ी ने अवध के नवाब वाजिद अली शाह पर कुशासन का आरोप लगाकर अवध का ब्रिटिश साम्राज्य में विलय कर लिया। यह 1857 के विद्रोह का एक प्रमुख कारण था।',
      },
      en: {
        question:
          'On what grounds did the British annex Awadh in 1856, which became a cause of the 1857 Revolt?',
        options: {
          A: 'Charge of misrule',
          B: 'Doctrine of Lapse',
          C: 'Subsidiary Alliance',
          D: 'Defeat in war',
          E: 'I do not want to answer',
        },
        explanation:
          'In 1856, Lord Dalhousie annexed Awadh by accusing Nawab Wajid Ali Shah of misrule. This was one of the main causes of the 1857 Revolt.',
      },
      correctOption: 'A',
    },
    {
      id: '1857-013',
      category: 'Important Dates',
      hi: {
        question: 'मंगल पांडे को फाँसी किस तारीख को दी गई थी?',
        options: {
          A: '10 मई 1857',
          B: '29 मार्च 1857',
          C: '8 अप्रैल 1857',
          D: '21 अप्रैल 1857',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          'मंगल पांडे ने 29 मार्च 1857 को बैरकपुर में विद्रोह किया था। उन्हें 8 अप्रैल 1857 को फाँसी दी गई।',
      },
      en: {
        question: 'On which date was Mangal Pandey hanged?',
        options: {
          A: '10 May 1857',
          B: '29 March 1857',
          C: '8 April 1857',
          D: '21 April 1857',
          E: 'I do not want to answer',
        },
        explanation:
          'Mangal Pandey revolted at Barrackpore on 29 March 1857. He was hanged on 8 April 1857.',
      },
      correctOption: 'C',
    },
    {
      id: '1857-014',
      category: 'Aftermath',
      hi: {
        question:
          '1857 के विद्रोह के बाद ईस्ट इंडिया कंपनी के शासन को समाप्त करके भारत का शासन किसके हाथों में आया?',
        options: {
          A: 'ब्रिटिश संसद',
          B: 'ब्रिटिश क्राउन (ब्रिटिश सम्राट)',
          C: 'वायसराय परिषद',
          D: 'भारत के गवर्नर जनरल',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          'भारत सरकार अधिनियम 1858 के तहत ईस्ट इंडिया कंपनी का शासन समाप्त हुआ और भारत का शासन सीधे ब्रिटिश क्राउन (महारानी विक्टोरिया) के अधीन आ गया।',
      },
      en: {
        question:
          'After the 1857 Revolt, who took over the administration of India from the East India Company?',
        options: {
          A: 'British Parliament',
          B: 'British Crown (British monarch)',
          C: 'Viceroy Council',
          D: 'Governor General of India',
          E: 'I do not want to answer',
        },
        explanation:
          'Under the Government of India Act 1858, the East India Company was abolished and India came under the direct rule of the British Crown (Queen Victoria).',
      },
      correctOption: 'B',
    },
    {
      id: '1857-015',
      category: 'Aftermath',
      hi: {
        question: 'भारत सरकार अधिनियम 1858 किस वर्ष पारित हुआ था?',
        options: {
          A: '1856',
          B: '1857',
          C: '1858',
          D: '1860',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          '1857 के विद्रोह के बाद ब्रिटिश संसद ने भारत सरकार अधिनियम 1858 पारित किया, जिसने ईस्ट इंडिया कंपनी को समाप्त कर भारत को सीधे ब्रिटिश क्राउन के अधीन कर दिया।',
      },
      en: {
        question: 'In which year was the Government of India Act passed after the 1857 Revolt?',
        options: {
          A: '1856',
          B: '1857',
          C: '1858',
          D: '1860',
          E: 'I do not want to answer',
        },
        explanation:
          'After the 1857 Revolt, the British Parliament passed the Government of India Act 1858, which abolished the East India Company and placed India directly under the British Crown.',
      },
      correctOption: 'C',
    },
    {
      id: '1857-016',
      category: 'Major Centres',
      hi: {
        question: '1857 के विद्रोह में दिल्ली को विद्रोहियों ने कब तक अपने नियंत्रण में रखा?',
        options: {
          A: 'मई से जून 1857',
          B: 'मई से सितम्बर 1857',
          C: 'मई से दिसम्बर 1857',
          D: 'मई से अगस्त 1857',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          'विद्रोहियों ने 11 मई 1857 को दिल्ली पर कब्ज़ा किया। अंग्रेज़ों ने सितम्बर 1857 में दिल्ली को फिर से जीत लिया।',
      },
      en: {
        question: 'How long did the rebels hold Delhi during the 1857 Revolt?',
        options: {
          A: 'May to June 1857',
          B: 'May to September 1857',
          C: 'May to December 1857',
          D: 'May to August 1857',
          E: 'I do not want to answer',
        },
        explanation:
          'The rebels captured Delhi on 11 May 1857. The British recaptured Delhi in September 1857.',
      },
      correctOption: 'B',
    },
    {
      id: '1857-017',
      category: 'Leaders',
      hi: {
        question: 'बहादुर शाह ज़फर को 1857 के विद्रोह की असफलता के बाद कहाँ निर्वासित किया गया था?',
        options: {
          A: 'लंदन',
          B: 'रंगून (यांगून)',
          C: 'अंडमान',
          D: 'सिलोन (श्रीलंका)',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          'विद्रोह की असफलता के बाद बहादुर शाह ज़फर को गिरफ़्तार करके रंगून (अब म्यांमार का यांगून) निर्वासित कर दिया गया, जहाँ 1862 में उनकी मृत्यु हुई।',
      },
      en: {
        question: 'Where was Bahadur Shah Zafar exiled after the failure of the 1857 Revolt?',
        options: {
          A: 'London',
          B: 'Rangoon (Yangon)',
          C: 'Andaman',
          D: 'Ceylon (Sri Lanka)',
          E: 'I do not want to answer',
        },
        explanation:
          'After the failure of the revolt, Bahadur Shah Zafar was arrested and exiled to Rangoon (now Yangon, Myanmar), where he died in 1862.',
      },
      correctOption: 'B',
    },
    {
      id: '1857-018',
      category: 'Important Dates',
      hi: {
        question: 'रानी लक्ष्मीबाई की मृत्यु किस वर्ष हुई थी?',
        options: {
          A: '1857',
          B: '1858',
          C: '1859',
          D: '1860',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          'रानी लक्ष्मीबाई 18 जून 1858 को ग्वालियर के पास कोटा की सराय में अंग्रेज़ों से लड़ते हुए शहीद हुईं।',
      },
      en: {
        question: 'In which year did Rani Lakshmibai die?',
        options: {
          A: '1857',
          B: '1858',
          C: '1859',
          D: '1860',
          E: 'I do not want to answer',
        },
        explanation:
          'Rani Lakshmibai was martyred on 18 June 1858 while fighting the British near Kota ki Sarai, Gwalior.',
      },
      correctOption: 'B',
    },
    {
      id: '1857-019',
      category: 'Causes',
      hi: {
        question: '1857 के विद्रोह का धार्मिक-सामाजिक कारण क्या था जो ईसाई मिशनरियों से जुड़ा था?',
        options: {
          A: 'मिशनरियों द्वारा जबरदस्ती धर्म परिवर्तन',
          B: 'अंग्रेज़ों का सती प्रथा उन्मूलन और विधवा पुनर्विवाह क़ानून',
          C: 'मिशनरियों का हिंदी भाषा विरोध',
          D: 'चर्चों का भारतीय भूमि पर निर्माण',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          'अंग्रेज़ों द्वारा सती प्रथा उन्मूलन (1829) और विधवा पुनर्विवाह क़ानून (1856) जैसे सुधारों से रूढ़िवादी भारतीय वर्ग में असंतोष था। उन्हें लगता था कि अंग्रेज़ उनके धर्म में हस्तक्षेप कर रहे हैं।',
      },
      en: {
        question:
          'Which social-religious cause of the 1857 Revolt was linked to British reform policies?',
        options: {
          A: 'Forced conversions by missionaries',
          B: 'British abolition of Sati and Widow Remarriage Act',
          C: "Missionaries' opposition to Hindi",
          D: 'Construction of churches on Indian land',
          E: 'I do not want to answer',
        },
        explanation:
          "British reforms like abolition of Sati (1829) and the Widow Remarriage Act (1856) angered conservative Indians, who feared interference in their religion.",
      },
      correctOption: 'B',
    },
    {
      id: '1857-020',
      category: 'Causes',
      hi: {
        question: '"जनरल सर्विस एनलिस्टमेंट एक्ट" 1856 किस कारण से 1857 के विद्रोह का कारण बना?',
        options: {
          A: 'सैनिकों को विदेश भेजने का प्रावधान',
          B: 'सैनिकों का वेतन कम करना',
          C: 'हिंदू सैनिकों का पद घटाना',
          D: 'मुस्लिम सैनिकों को निकालना',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          '"जनरल सर्विस एनलिस्टमेंट एक्ट" 1856 के तहत सैनिकों को समुद्र पार विदेश में भेजा जा सकता था। हिंदू धर्म में समुद्र पार जाना अशुभ माना जाता था, इसलिए सैनिकों ने इसे अपने धर्म पर खतरा माना।',
      },
      en: {
        question:
          'Why did the General Service Enlistment Act of 1856 contribute to the 1857 Revolt?',
        options: {
          A: 'It required soldiers to serve overseas',
          B: 'It reduced soldiers\' pay',
          C: 'It demoted Hindu soldiers',
          D: 'It dismissed Muslim soldiers',
          E: 'I do not want to answer',
        },
        explanation:
          'The General Service Enlistment Act of 1856 required soldiers to serve overseas if ordered. Crossing the sea was considered religiously impure by many Hindu soldiers, so they saw it as a threat to their faith.',
      },
      correctOption: 'A',
    },
    {
      id: '1857-021',
      category: 'Aftermath',
      hi: {
        question: '1857 के विद्रोह के बाद ब्रिटिश भारत के प्रशासन का प्रमुख क्या कहलाया?',
        options: {
          A: 'गवर्नर जनरल',
          B: 'वायसराय',
          C: 'सेक्रेटरी ऑफ स्टेट',
          D: 'कमांडर इन चीफ',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          'भारत सरकार अधिनियम 1858 के बाद गवर्नर जनरल का पद बदलकर "वायसराय" कर दिया गया। लॉर्ड कैनिंग भारत के पहले वायसराय बने।',
      },
      en: {
        question: "What was the head of British India's administration called after the 1857 Revolt?",
        options: {
          A: 'Governor General',
          B: 'Viceroy',
          C: 'Secretary of State',
          D: 'Commander in Chief',
          E: 'I do not want to answer',
        },
        explanation:
          "After the Government of India Act 1858, the title of Governor General was changed to 'Viceroy'. Lord Canning became India's first Viceroy.",
      },
      correctOption: 'B',
    },
    {
      id: '1857-022',
      category: 'Major Centres',
      hi: {
        question: '1857 के विद्रोह का प्रथम केंद्र कौन सा था?',
        options: {
          A: 'दिल्ली',
          B: 'कानपुर',
          C: 'मेरठ',
          D: 'बैरकपुर',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          'यद्यपि मंगल पांडे ने 29 मार्च 1857 को बैरकपुर में विद्रोह किया था, संगठित सैन्य विद्रोह 10 मई 1857 को मेरठ में हुआ, जिसे 1857 के विद्रोह का मुख्य प्रारंभिक केंद्र माना जाता है।',
      },
      en: {
        question: 'Which was the primary centre where the organised 1857 Revolt began?',
        options: {
          A: 'Delhi',
          B: 'Kanpur',
          C: 'Meerut',
          D: 'Barrackpore',
          E: 'I do not want to answer',
        },
        explanation:
          'Although Mangal Pandey revolted at Barrackpore on 29 March 1857, the organised military revolt began at Meerut on 10 May 1857, which is considered the main starting point of the 1857 Revolt.',
      },
      correctOption: 'C',
    },
    {
      id: '1857-023',
      category: 'Aftermath',
      hi: {
        question:
          '1857 के विद्रोह के बाद महारानी विक्टोरिया की उद्घोषणा (1858) में क्या वादा किया गया था?',
        options: {
          A: 'भारतीयों को स्वशासन दिया जाएगा',
          B: 'भारत को स्वतंत्र किया जाएगा',
          C: 'भेदभाव न करना और मौजूदा अधिकार बनाए रखना',
          D: 'भारत को राष्ट्रमंडल का सदस्य बनाया जाएगा',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          'महारानी विक्टोरिया की 1858 की उद्घोषणा में वादा किया गया कि ब्रिटिश सरकार धर्म व जाति के आधार पर भेदभाव नहीं करेगी और भारतीयों के पारंपरिक अधिकारों का सम्मान करेगी।',
      },
      en: {
        question:
          "What was promised in Queen Victoria's Proclamation of 1858 after the 1857 Revolt?",
        options: {
          A: 'Self-governance would be given to Indians',
          B: 'India would be freed',
          C: 'Non-discrimination and preservation of existing rights',
          D: 'India would become a Commonwealth member',
          E: 'I do not want to answer',
        },
        explanation:
          "Queen Victoria's Proclamation of 1858 promised that the British government would not discriminate on the basis of religion or caste and would respect the traditional rights of Indians.",
      },
      correctOption: 'C',
    },
    {
      id: '1857-024',
      category: 'Causes',
      hi: {
        question: '1857 के विद्रोह का आर्थिक कारण क्या था जो भारतीय कारीगरों से जुड़ा था?',
        options: {
          A: 'अंग्रेज़ों द्वारा भारतीय उद्योगों का विनाश और कारीगरों का बेरोज़गार होना',
          B: 'अंग्रेज़ों द्वारा कृषि कर में वृद्धि',
          C: 'नई मुद्रा प्रणाली लागू करना',
          D: 'व्यापारियों पर नए कर लगाना',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          'ब्रिटिश औद्योगिक माल के आयात से भारतीय हस्तशिल्प और कुटीर उद्योग नष्ट हो गए। इससे लाखों बुनकर और कारीगर बेरोज़गार हो गए, जो 1857 के विद्रोह का एक महत्वपूर्ण आर्थिक कारण था।',
      },
      en: {
        question:
          'What was the economic cause of the 1857 Revolt related to Indian artisans?',
        options: {
          A: 'British destruction of Indian industries leaving artisans unemployed',
          B: 'British increase in agricultural tax',
          C: 'Introduction of a new currency system',
          D: 'New taxes on traders',
          E: 'I do not want to answer',
        },
        explanation:
          'The import of British industrial goods destroyed Indian handicrafts and cottage industries, making millions of weavers and artisans unemployed. This was an important economic cause of the 1857 Revolt.',
      },
      correctOption: 'A',
    },
    {
      id: '1857-025',
      category: 'Important Dates',
      hi: {
        question: 'ब्रिटिश इतिहासकारों ने 1857 के विद्रोह को क्या कहा था?',
        options: {
          A: 'भारतीय स्वतंत्रता संग्राम',
          B: 'सिपाही विद्रोह (सिपाही म्यूटिनी)',
          C: 'किसान विद्रोह',
          D: 'राष्ट्रीय आंदोलन',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          'ब्रिटिश इतिहासकारों ने 1857 के विद्रोह को "सिपाही विद्रोह" (Sepoy Mutiny) कहा। जबकि वी.डी. सावरकर ने इसे "भारत का प्रथम स्वतंत्रता संग्राम" कहा।',
      },
      en: {
        question: 'What did British historians call the 1857 Revolt?',
        options: {
          A: 'Indian War of Independence',
          B: 'Sepoy Mutiny',
          C: 'Peasant Revolt',
          D: 'National Movement',
          E: 'I do not want to answer',
        },
        explanation:
          'British historians called the 1857 Revolt the "Sepoy Mutiny," whereas V.D. Savarkar called it "India\'s First War of Independence."',
      },
      correctOption: 'B',
    },
  ],
};

export default test;
