import type { ExamTest } from '@/types/exam';
import { tre4ExamConfig } from '../config';

const test: ExamTest = {
  id: 'tre4-2026-09-09-bhagat-singh-simon',
  slug: '2026-09-09-bhagat-singh-simon',
  date: '2026-09-09',
  title: 'Bhagat Singh, Chandrashekhar Azad & Simon Commission',
  titleHi: 'भगत सिंह, चंद्रशेखर आजाद और साइमन कमीशन',
  subject: 'History',
  subjectHi: 'इतिहास',
  topicId: 'bhagat-singh-simon',
  difficulty: 'Advanced',
  description:
    'Practice 50 very hard MCQs on Bhagat Singh, Chandrashekhar Azad, and the Simon Commission for BPSC/UPSC in Hindi or English. Topics include HSRA, Naujawan Bharat Sabha, the Saunders assassination, the Assembly Bomb Case, and detailed chronological analysis.',
  config: {
    ...tre4ExamConfig,
    totalQuestions: 50,
    durationMinutes: 25,
  },
  questions: [
    {
      id: 'bss-001',
      category: 'Naujawan Bharat Sabha / HSRA',
      hi: {
        question: 'निम्नलिखित में से किस संगठन की स्थापना में भगत सिंह की प्रमुख भूमिका थी?',
        options: {
          A: 'हिंदुस्तान रिपब्लिकन एसोसिएशन',
          B: 'नौजवान भारत सभा',
          C: 'अनुशीलन समिति',
          D: 'अभिनव भारत',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          'भगत सिंह ने सुखदेव थापर और अन्य साथियों के साथ मिलकर 1926 में लाहौर में नौजवान भारत सभा की स्थापना की। यह HRA से अलग एक जन-क्रांतिकारी संगठन था।',
      },
      en: {
        question: 'In which of the following organizations did Bhagat Singh play a leading role in founding?',
        options: {
          A: 'Hindustan Republican Association',
          B: 'Naujawan Bharat Sabha',
          C: 'Anushilan Samiti',
          D: 'Abhinav Bharat',
          E: 'I do not want to answer',
        },
        explanation:
          'Bhagat Singh, along with Sukhdev Thapar and others, founded the Naujawan Bharat Sabha in 1926 in Lahore. It was a mass revolutionary organisation separate from the HRA.',
      },
      correctOption: 'B',
    },
    {
      id: 'bss-002',
      category: 'Naujawan Bharat Sabha / HSRA',
      hi: {
        question: 'नौजवान भारत सभा की स्थापना मुख्यतः किस उद्देश्य से की गई थी?',
        options: {
          A: 'केवल सशस्त्र क्रांति की तैयारी',
          B: 'युवाओं में राष्ट्रवादी एवं क्रांतिकारी चेतना का प्रसार',
          C: 'प्रांतीय स्वायत्तता की मांग',
          D: 'किसान करों का विरोध',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          'नौजवान भारत सभा का मुख्य उद्देश्य भारत के युवाओं में राष्ट्रवादी और क्रांतिकारी चेतना का प्रसार करना था, ताकि वे औपनिवेशिक शासन के विरुद्ध संगठित हो सकें।',
      },
      en: {
        question: 'Naujawan Bharat Sabha was established primarily with which objective?',
        options: {
          A: 'Preparation for armed revolution only',
          B: 'Spreading nationalist and revolutionary consciousness among youth',
          C: 'Demand for provincial autonomy',
          D: 'Opposition to peasant taxes',
          E: 'I do not want to answer',
        },
        explanation:
          'The primary objective of the Naujawan Bharat Sabha was to spread nationalist and revolutionary consciousness among the youth of India, uniting them against colonial rule.',
      },
      correctOption: 'B',
    },
    {
      id: 'bss-003',
      category: 'Naujawan Bharat Sabha / HSRA',
      hi: {
        question:
          'हिंदुस्तान रिपब्लिकन एसोसिएशन को पुनर्गठित कर हिंदुस्तान सोशलिस्ट रिपब्लिकन एसोसिएशन बनाने का निर्णय मुख्यतः किस स्थान पर लिया गया?',
        options: {
          A: 'इलाहाबाद',
          B: 'फिरोजशाह कोटला, दिल्ली',
          C: 'लाहौर',
          D: 'कानपुर',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          'HRA को पुनर्गठित कर HSRA बनाने का निर्णय 1928 में फिरोजशाह कोटला, दिल्ली में एक बैठक में लिया गया, जहाँ क्रांतिकारी विचारधारा में समाजवादी लक्ष्यों को शामिल किया गया।',
      },
      en: {
        question:
          'The decision to reorganise the Hindustan Republican Association into the Hindustan Socialist Republican Association was primarily taken at which place?',
        options: {
          A: 'Allahabad',
          B: 'Feroz Shah Kotla, Delhi',
          C: 'Lahore',
          D: 'Kanpur',
          E: 'I do not want to answer',
        },
        explanation:
          'The decision to reorganise HRA into HSRA was taken at a meeting at Feroz Shah Kotla, Delhi in 1928, where the revolutionary ideology was expanded to include socialist goals.',
      },
      correctOption: 'B',
    },
    {
      id: 'bss-004',
      category: 'Naujawan Bharat Sabha / HSRA',
      hi: {
        question: "HSRA के नाम में 'Socialist' शब्द जोड़ना मुख्यतः किस वैचारिक परिवर्तन को दर्शाता है?",
        options: {
          A: 'धार्मिक राष्ट्रवाद की ओर झुकाव',
          B: 'केवल ब्रिटिश अधिकारियों की हत्या पर जोर',
          C: 'राजनीतिक स्वतंत्रता के साथ सामाजिक-आर्थिक परिवर्तन की धारणा',
          D: 'संवैधानिक सुधारों को स्वीकार करना',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          "'Socialist' शब्द जोड़ना भगत सिंह और साथियों की इस मान्यता को दर्शाता है कि केवल राजनीतिक स्वतंत्रता पर्याप्त नहीं — सामाजिक-आर्थिक परिवर्तन भी उतना ही आवश्यक है।",
      },
      en: {
        question: "The addition of the word 'Socialist' to the name of HSRA primarily reflects which ideological change?",
        options: {
          A: 'Inclination towards religious nationalism',
          B: 'Emphasis only on killing British officials',
          C: 'Conception of socio-economic change alongside political freedom',
          D: 'Acceptance of constitutional reforms',
          E: 'I do not want to answer',
        },
        explanation:
          "The addition of 'Socialist' reflected Bhagat Singh's and his comrades' belief that political freedom alone was insufficient — socio-economic transformation was equally necessary.",
      },
      correctOption: 'C',
    },
    {
      id: 'bss-005',
      category: 'Saunders Assassination',
      hi: {
        question: 'लाला लाजपत राय पर लाठीचार्ज के लिए क्रांतिकारियों का वास्तविक लक्ष्य कौन था?',
        options: {
          A: 'जेम्स ए. स्कॉट',
          B: 'जे.पी. सॉन्डर्स',
          C: 'लॉर्ड इरविन',
          D: 'जॉन साइमन',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          'क्रांतिकारियों का वास्तविक लक्ष्य लाहौर के पुलिस अधीक्षक जेम्स ए. स्कॉट थे, जिन्होंने लाठीचार्ज का आदेश दिया था। पहचान की भूल से सॉन्डर्स मारे गए।',
      },
      en: {
        question: 'Who was the actual target of the revolutionaries for the lathi-charge on Lala Lajpat Rai?',
        options: {
          A: 'James A. Scott',
          B: 'J.P. Saunders',
          C: 'Lord Irwin',
          D: 'John Simon',
          E: 'I do not want to answer',
        },
        explanation:
          'The actual intended target was James A. Scott, the Superintendent of Police, who had ordered the lathi-charge on Lala Lajpat Rai. Due to mistaken identity, Saunders was killed instead.',
      },
      correctOption: 'A',
    },
    {
      id: 'bss-006',
      category: 'Saunders Assassination',
      hi: {
        question: 'सॉन्डर्स की हत्या का प्रमुख कारण क्या था?',
        options: {
          A: 'साइमन कमीशन की नियुक्ति',
          B: 'लाला लाजपत राय की मृत्यु का बदला',
          C: 'भगत सिंह की गिरफ्तारी',
          D: 'HSRA पर प्रतिबंध',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          'जे.पी. सॉन्डर्स की हत्या 17 दिसंबर 1928 को लाला लाजपत राय की मृत्यु का बदला लेने के लिए की गई, जो साइमन कमीशन विरोध प्रदर्शन में लाठीचार्ज से हुई चोटों के कारण मारे गए थे।',
      },
      en: {
        question: 'What was the primary reason for the assassination of Saunders?',
        options: {
          A: 'Appointment of the Simon Commission',
          B: 'Revenge for the death of Lala Lajpat Rai',
          C: 'Arrest of Bhagat Singh',
          D: 'Ban on HSRA',
          E: 'I do not want to answer',
        },
        explanation:
          'The assassination of J.P. Saunders on 17 December 1928 was carried out to avenge the death of Lala Lajpat Rai, who died from injuries sustained during a lathi-charge at a Simon Commission protest.',
      },
      correctOption: 'B',
    },
    {
      id: 'bss-007',
      category: 'Saunders Assassination',
      hi: {
        question: 'सॉन्डर्स की हत्या में पहचान की भूल के कारण किस अधिकारी को निशाना बनाया गया?',
        options: {
          A: 'पुलिस अधीक्षक स्कॉट',
          B: 'सहायक पुलिस अधीक्षक सॉन्डर्स',
          C: 'इंस्पेक्टर फर्न',
          D: 'मजिस्ट्रेट सैंडर्स',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          'पहचान की भूल के कारण वास्तविक लक्ष्य स्कॉट के बजाय सहायक पुलिस अधीक्षक जे.पी. सॉन्डर्स को निशाना बनाया गया।',
      },
      en: {
        question: 'Due to a case of mistaken identity in the Saunders assassination, which official was targeted?',
        options: {
          A: 'Superintendent of Police Scott',
          B: 'Assistant Superintendent of Police Saunders',
          C: 'Inspector Fern',
          D: 'Magistrate Sanders',
          E: 'I do not want to answer',
        },
        explanation:
          'Due to mistaken identity, Assistant Superintendent of Police J.P. Saunders was targeted and killed instead of the actual intended target, Superintendent of Police Scott.',
      },
      correctOption: 'B',
    },
    {
      id: 'bss-008',
      category: 'Saunders Assassination',
      hi: {
        question: 'सॉन्डर्स की हत्या के समय राजगुरु की प्रमुख भूमिका क्या थी?',
        options: {
          A: 'योजना बनाना',
          B: 'पहला गोली प्रहार करना',
          C: 'भागने के लिए वाहन उपलब्ध कराना',
          D: 'पोस्टर छापना',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          'राजगुरु ने सॉन्डर्स के लाहौर पुलिस मुख्यालय से निकलते समय पहली गोली चलाई। भगत सिंह ने तत्पश्चात गोलियाँ चलाईं।',
      },
      en: {
        question: "What was Rajguru's primary role at the time of the Saunders assassination?",
        options: {
          A: 'Planning',
          B: 'Firing the first shot',
          C: 'Providing vehicle for escape',
          D: 'Printing posters',
          E: 'I do not want to answer',
        },
        explanation:
          'Rajguru fired the first shot at Saunders when he emerged from the Lahore police headquarters. Bhagat Singh then fired further shots.',
      },
      correctOption: 'B',
    },
    {
      id: 'bss-009',
      category: 'Saunders Assassination',
      hi: {
        question:
          'सॉन्डर्स हत्या के बाद भगत सिंह के लाहौर से निकलने में किस महिला क्रांतिकारी ने महत्वपूर्ण भूमिका निभाई?',
        options: {
          A: 'कल्पना दत्त',
          B: 'दुर्गा भाभी',
          C: 'प्रीतिलता वाडेदार',
          D: 'सुचेता कृपलानी',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          'दुर्गा भाभी (दुर्गावती देवी), क्रांतिकारी भगवती चरण वोहरा की पत्नी, ने भगत सिंह के साथ पति-पत्नी का वेश धारण कर लाहौर से सुरक्षित बाहर निकलने में महत्वपूर्ण भूमिका निभाई।',
      },
      en: {
        question:
          'Which woman revolutionary played an important role in helping Bhagat Singh escape from Lahore after the Saunders assassination?',
        options: {
          A: 'Kalpana Dutta',
          B: 'Durga Bhabhi',
          C: 'Pritilata Waddedar',
          D: 'Sucheta Kripalani',
          E: 'I do not want to answer',
        },
        explanation:
          'Durga Bhabhi (Durgawati Devi), wife of revolutionary Bhagwati Charan Vohra, played a crucial role by accompanying Bhagat Singh disguised as a couple, enabling his safe escape from Lahore.',
      },
      correctOption: 'B',
    },
    {
      id: 'bss-010',
      category: 'Assembly Bomb Case',
      hi: {
        question: 'Central Legislative Assembly में बम फेंकने का मुख्य उद्देश्य क्या था?',
        options: {
          A: 'ब्रिटिश अधिकारियों की सामूहिक हत्या',
          B: 'विधानसभा भवन को नष्ट करना',
          C: 'सरकार का ध्यान क्रांतिकारी संदेश की ओर आकर्षित करना',
          D: 'साइमन कमीशन के सदस्यों को मारना',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          "उद्देश्य हत्या नहीं बल्कि 'बहरों को सुनाना' था — अपने क्रांतिकारी पर्चों और नारों के माध्यम से सरकार का ध्यान आकर्षित करना। इसीलिए बम जानबूझकर कम घातक बनाए गए।",
      },
      en: {
        question: 'What was the primary objective of throwing bombs in the Central Legislative Assembly?',
        options: {
          A: 'Mass killing of British officials',
          B: 'Destruction of the assembly building',
          C: "Drawing the government's attention to the revolutionary message",
          D: 'Killing members of the Simon Commission',
          E: 'I do not want to answer',
        },
        explanation:
          "The objective was not to kill but to 'make the deaf hear' — to draw the government's attention to their revolutionary message through pamphlets and slogans. The bombs were intentionally low-intensity.",
      },
      correctOption: 'C',
    },
    {
      id: 'bss-011',
      category: 'Assembly Bomb Case',
      hi: {
        question: 'Central Legislative Assembly में बम फेंकने वाले दो प्रमुख क्रांतिकारी कौन थे?',
        options: {
          A: 'भगत सिंह और राजगुरु',
          B: 'भगत सिंह और बटुकेश्वर दत्त',
          C: 'आजाद और भगत सिंह',
          D: 'सुखदेव और राजगुरु',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          'भगत सिंह और बटुकेश्वर दत्त ने 8 अप्रैल 1929 को केंद्रीय विधान सभा में जानबूझकर कम तीव्रता वाले बम फेंके, जिसमें जानमाल का नुकसान न हो।',
      },
      en: {
        question: 'Which two prominent revolutionaries threw bombs in the Central Legislative Assembly?',
        options: {
          A: 'Bhagat Singh and Rajguru',
          B: 'Bhagat Singh and Batukeshwar Dutt',
          C: 'Azad and Bhagat Singh',
          D: 'Sukhdev and Rajguru',
          E: 'I do not want to answer',
        },
        explanation:
          'Bhagat Singh and Batukeshwar Dutt threw deliberately low-intensity bombs in the Central Legislative Assembly on 8 April 1929, avoiding casualties.',
      },
      correctOption: 'B',
    },
    {
      id: 'bss-012',
      category: 'Assembly Bomb Case',
      hi: {
        question:
          'Assembly Bomb Case में बम फेंकने के बाद भगत सिंह और बटुकेश्वर दत्त ने क्या किया?',
        options: {
          A: 'गुप्त सुरंग से भाग निकले',
          B: 'पुलिस से मुठभेड़ की',
          C: 'स्वयं गिरफ्तारी दी',
          D: 'फ्रांस भाग गए',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          'भगत सिंह और बटुकेश्वर दत्त भागे नहीं। उन्होंने जानबूझकर गिरफ्तारी दी ताकि मुकदमे को अपनी क्रांतिकारी विचारधारा के प्रचार मंच के रूप में उपयोग कर सकें।',
      },
      en: {
        question:
          'What did Bhagat Singh and Batukeshwar Dutt do after throwing the bombs in the Assembly Bomb Case?',
        options: {
          A: 'Escaped through a secret tunnel',
          B: 'Engaged in a confrontation with police',
          C: 'Surrendered themselves for arrest',
          D: 'Fled to France',
          E: 'I do not want to answer',
        },
        explanation:
          'Bhagat Singh and Batukeshwar Dutt deliberately surrendered to police, intending to use the subsequent trial as a platform to spread their revolutionary message to the nation.',
      },
      correctOption: 'C',
    },
    {
      id: 'bss-013',
      category: 'Assembly Bomb Case',
      hi: {
        question: 'विधानसभा बम कांड से संबंधित कौन-सा नारा विशेष रूप से प्रसिद्ध हुआ?',
        options: {
          A: 'करो या मरो',
          B: 'जय हिंद',
          C: 'इंकलाब जिंदाबाद',
          D: 'दिल्ली चलो',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          "'इंकलाब जिंदाबाद' (क्रांति अमर रहे) विधानसभा बम कांड और व्यापक क्रांतिकारी आंदोलन का प्रतीक नारा बन गया।",
      },
      en: {
        question: 'Which slogan became especially famous in connection with the Assembly Bomb Case?',
        options: {
          A: 'Do or Die',
          B: 'Jai Hind',
          C: 'Inquilab Zindabad',
          D: 'Delhi Chalo',
          E: 'I do not want to answer',
        },
        explanation:
          "'Inquilab Zindabad' (Long Live the Revolution) became the iconic slogan associated with the Assembly Bomb Case and the broader revolutionary movement.",
      },
      correctOption: 'C',
    },
    {
      id: 'bss-014',
      category: 'Assembly Bomb Case',
      hi: {
        question:
          "'इंकलाब जिंदाबाद' नारे को व्यापक क्रांतिकारी राजनीतिक लोकप्रियता देने में किसकी विशेष भूमिका रही?",
        options: {
          A: 'भगत सिंह',
          B: 'महात्मा गांधी',
          C: 'लाला लाजपत राय',
          D: 'गोपाल कृष्ण गोखले',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          "भगत सिंह ने 'इंकलाब जिंदाबाद' को क्रांतिकारी राजनीतिक नारे के रूप में लोकप्रिय बनाने में विशेष भूमिका निभाई, जिसे राष्ट्रवादी और समाजवादी अर्थ दिया।",
      },
      en: {
        question:
          "Who played a special role in giving the slogan 'Inquilab Zindabad' widespread revolutionary political popularity?",
        options: {
          A: 'Bhagat Singh',
          B: 'Mahatma Gandhi',
          C: 'Lala Lajpat Rai',
          D: 'Gopal Krishna Gokhale',
          E: 'I do not want to answer',
        },
        explanation:
          "Bhagat Singh played a key role in popularising 'Inquilab Zindabad' as a revolutionary political slogan, giving it its modern nationalist and socialist connotation.",
      },
      correctOption: 'A',
    },
    {
      id: 'bss-015',
      category: 'Assembly Bomb Case',
      hi: {
        question:
          'Assembly Bomb Case में प्रयुक्त बमों की प्रकृति के बारे में कौन-सा कथन सही है?',
        options: {
          A: 'अधिकतम जनहानि के लिए बनाए गए थे',
          B: 'प्रतीकात्मक विस्फोट और प्रचार प्रभाव हेतु अपेक्षाकृत कम घातक बनाए गए थे',
          C: 'वे विस्फोट नहीं हुए',
          D: 'उनका लक्ष्य जॉन साइमन था',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          'बम जानबूझकर कम घातक बनाए गए थे ताकि प्रतीकात्मक विस्फोट हो और प्रचार प्रभाव हो — हत्या का उद्देश्य नहीं था।',
      },
      en: {
        question:
          'Which statement is correct about the nature of the bombs used in the Assembly Bomb Case?',
        options: {
          A: 'Were designed to cause maximum casualties',
          B: 'Were made relatively less lethal for symbolic explosion and propaganda effect',
          C: 'They did not explode',
          D: 'Their target was John Simon',
          E: 'I do not want to answer',
        },
        explanation:
          'The bombs were intentionally designed to be low-intensity — not to kill but to create a symbolic impact and draw public attention to their political manifesto.',
      },
      correctOption: 'B',
    },
    {
      id: 'bss-016',
      category: 'Hunger Strike',
      hi: {
        question: 'भगत सिंह ने जेल में लंबी भूख हड़ताल मुख्यतः किस मांग को लेकर की?',
        options: {
          A: 'तत्काल रिहाई',
          B: 'राजनीतिक कैदियों के साथ समान और सम्मानजनक व्यवहार',
          C: 'मुकदमे को लंदन स्थानांतरित करने',
          D: 'मृत्युदंड समाप्त करने',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          'भगत सिंह और अन्य राजनीतिक कैदियों ने बेहतर भोजन, पढ़ने की सामग्री और रहन-सहन की स्थितियों सहित राजनीतिक कैदियों के रूप में सम्मानजनक व्यवहार की माँग को लेकर भूख हड़ताल की।',
      },
      en: {
        question:
          'What was the primary demand for which Bhagat Singh undertook a long hunger strike in jail?',
        options: {
          A: 'Immediate release',
          B: 'Equal and dignified treatment for political prisoners',
          C: 'Transfer of the trial to London',
          D: 'Abolition of capital punishment',
          E: 'I do not want to answer',
        },
        explanation:
          'Bhagat Singh and other political prisoners went on hunger strike demanding the right to be treated as political prisoners, including better food, reading materials, and living conditions.',
      },
      correctOption: 'B',
    },
    {
      id: 'bss-017',
      category: 'Hunger Strike',
      hi: {
        question:
          'भगत सिंह और उनके साथियों की भूख हड़ताल के दौरान किस क्रांतिकारी की मृत्यु हुई?',
        options: {
          A: 'जतिन दास',
          B: 'भगवती चरण वोहरा',
          C: 'अशफाक उल्ला खान',
          D: 'रामप्रसाद बिस्मिल',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          'जतिन दास (यतीन्द्र नाथ दास) 63 दिनों की भूख हड़ताल के बाद 13 सितंबर 1929 को शहीद हुए। उनकी मृत्यु ने पूरे देश को झकझोर दिया।',
      },
      en: {
        question:
          'Which revolutionary died during the hunger strike of Bhagat Singh and his comrades?',
        options: {
          A: 'Jatin Das',
          B: 'Bhagwati Charan Vohra',
          C: 'Ashfaqullah Khan',
          D: 'Ram Prasad Bismil',
          E: 'I do not want to answer',
        },
        explanation:
          'Jatin Das (Yatindra Nath Das) died after 63 days of hunger strike on 13 September 1929, becoming a martyr whose death stirred the entire nation.',
      },
      correctOption: 'A',
    },
    {
      id: 'bss-018',
      category: 'Hunger Strike',
      hi: {
        question:
          'जतिन दास की मृत्यु ने किस मुद्दे को पूरे देश में विशेष रूप से उजागर किया?',
        options: {
          A: 'साइमन कमीशन का गठन',
          B: 'जेलों में राजनीतिक कैदियों की स्थिति',
          C: 'पृथक निर्वाचन',
          D: 'प्रांतीय स्वायत्तता',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          'जतिन दास की मृत्यु ने ब्रिटिश भारत की जेलों में राजनीतिक कैदियों की दयनीय दशा को राष्ट्रव्यापी चिंता का विषय बना दिया।',
      },
      en: {
        question:
          'The death of Jatin Das particularly highlighted which issue across the country?',
        options: {
          A: 'Formation of the Simon Commission',
          B: 'Condition of political prisoners in jails',
          C: 'Separate electorate',
          D: 'Provincial autonomy',
          E: 'I do not want to answer',
        },
        explanation:
          "Jatin Das's death highlighted the deplorable conditions of political prisoners in British Indian jails and became a major issue of national concern.",
      },
      correctOption: 'B',
    },
    {
      id: 'bss-019',
      category: 'Lahore Conspiracy Case',
      hi: {
        question:
          'भगत सिंह, सुखदेव और राजगुरु को मुख्यतः किस मामले में मृत्युदंड दिया गया?',
        options: {
          A: 'Assembly Bomb Case',
          B: 'Lahore Conspiracy Case',
          C: 'Kakori Case',
          D: 'Meerut Conspiracy Case',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          'भगत सिंह, सुखदेव और राजगुरु को Lahore Conspiracy Case (सॉन्डर्स हत्याकांड) में मृत्युदंड दिया गया, न कि Assembly Bomb Case में।',
      },
      en: {
        question:
          'Bhagat Singh, Sukhdev, and Rajguru were primarily sentenced to death in which case?',
        options: {
          A: 'Assembly Bomb Case',
          B: 'Lahore Conspiracy Case',
          C: 'Kakori Case',
          D: 'Meerut Conspiracy Case',
          E: 'I do not want to answer',
        },
        explanation:
          'Bhagat Singh, Sukhdev, and Rajguru were tried and sentenced to death in the Lahore Conspiracy Case (Saunders assassination case), not the Assembly Bomb Case.',
      },
      correctOption: 'B',
    },
    {
      id: 'bss-020',
      category: 'Lahore Conspiracy Case',
      hi: {
        question: 'भगत सिंह, राजगुरु और सुखदेव को फांसी कब दी गई?',
        options: {
          A: '23 मार्च 1931',
          B: '24 मार्च 1931',
          C: '8 अप्रैल 1929',
          D: '17 दिसंबर 1928',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          'भगत सिंह, राजगुरु और सुखदेव को 23 मार्च 1931 को लाहौर सेंट्रल जेल में फांसी दी गई। यह दिन शहीद दिवस के रूप में जाना जाता है।',
      },
      en: {
        question: 'When were Bhagat Singh, Rajguru, and Sukhdev hanged?',
        options: {
          A: '23 March 1931',
          B: '24 March 1931',
          C: '8 April 1929',
          D: '17 December 1928',
          E: 'I do not want to answer',
        },
        explanation:
          'Bhagat Singh, Rajguru, and Sukhdev were hanged on 23 March 1931 at Lahore Central Jail. This day is observed as Shaheed Diwas (Martyrs\' Day).',
      },
      correctOption: 'A',
    },
    {
      id: 'bss-021',
      category: "Bhagat Singh's Ideology",
      hi: {
        question:
          'भगत सिंह की राजनीतिक विचारधारा के अंतिम चरण को सबसे सही रूप में कैसे वर्णित किया जा सकता है?',
        options: {
          A: 'केवल उग्र राष्ट्रवादी',
          B: 'उदार संवैधानिक राष्ट्रवादी',
          C: 'समाजवादी और क्रांतिकारी गणतंत्रवादी',
          D: 'धार्मिक पुनरुत्थानवादी',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          'अंतिम चरण में भगत सिंह स्पष्ट रूप से समाजवादी और क्रांतिकारी गणतंत्रवादी थे। वे मानते थे कि श्रमिकों और किसानों के नेतृत्व में सशस्त्र क्रांति द्वारा परिवर्तन आएगा।',
      },
      en: {
        question:
          "How can the final phase of Bhagat Singh's political ideology most accurately be described?",
        options: {
          A: 'Purely militant nationalist',
          B: 'Liberal constitutional nationalist',
          C: 'Socialist and revolutionary republican',
          D: 'Religious revivalist',
          E: 'I do not want to answer',
        },
        explanation:
          'In the final phase, Bhagat Singh clearly identified himself as a socialist and revolutionary republican, believing in workers\' and peasants\' rule through armed revolution.',
      },
      correctOption: 'C',
    },
    {
      id: 'bss-022',
      category: "Bhagat Singh's Ideology",
      hi: {
        question: "'Why I Am an Atheist' किससे संबंधित है?",
        options: {
          A: 'चंद्रशेखर आजाद',
          B: 'भगत सिंह',
          C: 'सुखदेव',
          D: 'बटुकेश्वर दत्त',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          "'Why I Am an Atheist' भगत सिंह द्वारा 1930 में जेल में लिखा गया था, उन मित्रों को जवाब देते हुए जिन्होंने सुझाया था कि फांसी से पहले उन्हें ईश्वर में आस्था रखनी चाहिए।",
      },
      en: {
        question: "'Why I Am an Atheist' is associated with whom?",
        options: {
          A: 'Chandrashekhar Azad',
          B: 'Bhagat Singh',
          C: 'Sukhdev',
          D: 'Batukeshwar Dutt',
          E: 'I do not want to answer',
        },
        explanation:
          "'Why I Am an Atheist' was written by Bhagat Singh in 1930 while in jail, in response to friends who suggested he should pray to God before his execution.",
      },
      correctOption: 'B',
    },
    {
      id: 'bss-023',
      category: "Bhagat Singh's Ideology",
      hi: {
        question:
          "भगत सिंह के संदर्भ में 'क्रांति' की धारणा का सबसे उपयुक्त अर्थ क्या था?",
        options: {
          A: 'केवल व्यक्तिगत आतंक',
          B: 'केवल अंग्रेज अधिकारियों की हत्या',
          C: 'अन्यायपूर्ण सामाजिक-राजनीतिक व्यवस्था में व्यापक परिवर्तन',
          D: 'राजतंत्र की स्थापना',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          "भगत सिंह के लिए 'क्रांति' का अर्थ था अन्यायपूर्ण सामाजिक-राजनीतिक और आर्थिक व्यवस्था में मौलिक परिवर्तन — केवल राजनीतिक स्वतंत्रता नहीं।",
      },
      en: {
        question:
          "What was the most appropriate meaning of the concept of 'revolution' in Bhagat Singh's context?",
        options: {
          A: 'Individual terror only',
          B: 'Killing British officials only',
          C: 'Comprehensive transformation of the unjust socio-political order',
          D: 'Establishment of monarchy',
          E: 'I do not want to answer',
        },
        explanation:
          "For Bhagat Singh, 'revolution' meant a fundamental transformation of the unjust socio-political and economic order — not merely political independence.",
      },
      correctOption: 'C',
    },
    {
      id: 'bss-024',
      category: "Bhagat Singh's Ideology",
      hi: {
        question: 'निम्न में से कौन-सा भगत सिंह की विचारधारा से सर्वाधिक मेल खाता है?',
        options: {
          A: 'राजनीतिक स्वतंत्रता सामाजिक परिवर्तन के बिना भी पर्याप्त है',
          B: 'क्रांति का लक्ष्य केवल सत्ता हस्तांतरण नहीं, व्यवस्था परिवर्तन भी है',
          C: 'औपनिवेशिक व्यवस्था के भीतर सुधार पर्याप्त हैं',
          D: 'धार्मिक राज्य आदर्श राजनीतिक लक्ष्य है',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          'भगत सिंह का मानना था कि क्रांति का उद्देश्य केवल ब्रिटिश हाथों से भारतीय हाथों में सत्ता हस्तांतरण नहीं, बल्कि सामाजिक-आर्थिक व्यवस्था का आमूल परिवर्तन भी है।',
      },
      en: {
        question: "Which of the following best aligns with Bhagat Singh's ideology?",
        options: {
          A: 'Political freedom is sufficient even without social change',
          B: 'The goal of revolution is not merely transfer of power but also transformation of the system',
          C: 'Reforms within the colonial system are sufficient',
          D: 'Religious state is the ideal political goal',
          E: 'I do not want to answer',
        },
        explanation:
          "Bhagat Singh believed that the goal of revolution must include transformation of the socio-economic system, not merely a transfer of power from British to Indian hands.",
      },
      correctOption: 'B',
    },
    {
      id: 'bss-025',
      category: 'Chandrashekhar Azad',
      hi: {
        question: 'चंद्रशेखर आजाद का मूल नाम क्या था?',
        options: {
          A: 'चंद्रशेखर तिवारी',
          B: 'चंद्रशेखर शुक्ल',
          C: 'चंद्रशेखर त्रिपाठी',
          D: 'चंद्रशेखर वर्मा',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          'चंद्रशेखर आजाद का जन्म 1906 में चंद्रशेखर तिवारी के रूप में हुआ था। उन्होंने "आजाद" (स्वतंत्र) नाम को अपनी पहचान के रूप में अपनाया।',
      },
      en: {
        question: "What was Chandrashekhar Azad's original name?",
        options: {
          A: 'Chandrashekhar Tiwari',
          B: 'Chandrashekhar Shukla',
          C: 'Chandrashekhar Tripathi',
          D: 'Chandrashekhar Varma',
          E: 'I do not want to answer',
        },
        explanation:
          "Chandrashekhar Azad was born as Chandrashekhar Tiwari in 1906. He adopted 'Azad' (meaning 'free') as his revolutionary identity.",
      },
      correctOption: 'A',
    },
    {
      id: 'bss-026',
      category: 'Chandrashekhar Azad',
      hi: {
        question:
          "'आजाद' उपनाम चंद्रशेखर से किस घटना के बाद विशेष रूप से जुड़ा?",
        options: {
          A: 'काकोरी कांड के बाद',
          B: 'असहयोग आंदोलन के दौरान गिरफ्तारी और अदालत में दिए उत्तर के बाद',
          C: 'HSRA बनने के बाद',
          D: 'अल्फ्रेड पार्क मुठभेड़ के बाद',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          "असहयोग आंदोलन में गिरफ्तारी के बाद मजिस्ट्रेट के समक्ष पेश होने पर चंद्रशेखर ने अपना नाम 'आजाद', पिता का नाम 'स्वतंत्रता' और पता 'जेल' बताया। कोड़े सहने के बाद 'आजाद' उपनाम विशेष रूप से जुड़ गया।",
      },
      en: {
        question:
          "After which event did the epithet 'Azad' become specially associated with Chandrashekhar?",
        options: {
          A: 'After the Kakori incident',
          B: 'After his arrest during the Non-Cooperation Movement and the answers he gave in court',
          C: 'After the formation of HSRA',
          D: 'After the Alfred Park encounter',
          E: 'I do not want to answer',
        },
        explanation:
          "When produced before a magistrate after his arrest during the Non-Cooperation Movement, Chandrashekhar defiantly declared his name as 'Azad', his father's name as 'Swatantrata' (freedom), and his address as 'jail'. After bearing lashes silently, the epithet 'Azad' stuck.",
      },
      correctOption: 'B',
    },
    {
      id: 'bss-027',
      category: 'Chandrashekhar Azad',
      hi: {
        question: 'अदालत में पूछे जाने पर चंद्रशेखर ने अपना नाम क्या बताया था?',
        options: {
          A: 'क्रांति',
          B: 'आजाद',
          C: 'हिंदुस्तानी',
          D: 'स्वराज',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          "अदालत में चंद्रशेखर ने अपना नाम 'आजाद' (स्वतंत्र), पिता का नाम 'स्वतंत्रता' और घर का पता 'जेल' बताया।",
      },
      en: {
        question: 'When asked in court, what name did Chandrashekhar give as his?',
        options: {
          A: 'Kranti (Revolution)',
          B: 'Azad (Free)',
          C: 'Hindustani (Indian)',
          D: 'Swaraj (Self-rule)',
          E: 'I do not want to answer',
        },
        explanation:
          "In court, Chandrashekhar declared his name as 'Azad' (Free), his father's name as 'Swatantrata' (Freedom), and his home as 'jail'.",
      },
      correctOption: 'B',
    },
    {
      id: 'bss-028',
      category: 'Chandrashekhar Azad',
      hi: {
        question:
          'काकोरी कांड के बाद HRA नेतृत्व के पुनर्गठन में किसकी भूमिका विशेष रूप से महत्वपूर्ण रही?',
        options: {
          A: 'चंद्रशेखर आजाद',
          B: 'जॉन साइमन',
          C: 'लाला लाजपत राय',
          D: 'मोतीलाल नेहरू',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          'काकोरी कांड के बाद रामप्रसाद बिस्मिल और अशफाक उल्ला खान जैसे प्रमुख नेताओं को फाँसी होने के बाद चंद्रशेखर आजाद ने HRA को पुनर्जीवित और पुनर्गठित करने में निर्णायक भूमिका निभाई।',
      },
      en: {
        question:
          'Whose role was particularly important in reorganising the HRA leadership after the Kakori incident?',
        options: {
          A: 'Chandrashekhar Azad',
          B: 'John Simon',
          C: 'Lala Lajpat Rai',
          D: 'Motilal Nehru',
          E: 'I do not want to answer',
        },
        explanation:
          'After key leaders like Ram Prasad Bismil and Ashfaqullah Khan were hanged following the Kakori case, Chandrashekhar Azad played a decisive role in reorganising and reviving the HRA under new leadership.',
      },
      correctOption: 'A',
    },
    {
      id: 'bss-029',
      category: 'Chandrashekhar Azad',
      hi: {
        question:
          'HSRA में चंद्रशेखर आजाद की भूमिका को सबसे सही रूप में कैसे बताया जा सकता है?',
        options: {
          A: 'केवल प्रचारक',
          B: 'सैन्य/सशस्त्र संगठन के प्रमुख नेतृत्वकर्ता',
          C: 'ब्रिटिश सरकार के वार्ताकार',
          D: 'विधायी सदस्य',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          'आजाद HSRA के सशस्त्र विंग के कमांडर-इन-चीफ थे और संगठन की सैन्य एवं परिचालन गतिविधियों के प्रमुख नेतृत्वकर्ता थे।',
      },
      en: {
        question:
          "How can Chandrashekhar Azad's role in HSRA most accurately be described?",
        options: {
          A: 'Propagandist only',
          B: 'Chief leader of the military/armed organisation',
          C: 'Negotiator with the British government',
          D: 'Legislative member',
          E: 'I do not want to answer',
        },
        explanation:
          "Azad was the commander-in-chief of the HSRA's armed wing, responsible for the military and operational aspects of the organisation.",
      },
      correctOption: 'B',
    },
    {
      id: 'bss-030',
      category: 'Chandrashekhar Azad',
      hi: {
        question: 'चंद्रशेखर आजाद की मृत्यु कहाँ हुई?',
        options: {
          A: 'लाहौर सेंट्रल जेल',
          B: 'अल्फ्रेड पार्क, इलाहाबाद',
          C: 'फिरोजशाह कोटला',
          D: 'कानपुर',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          'चंद्रशेखर आजाद की मृत्यु 27 फरवरी 1931 को इलाहाबाद के अल्फ्रेड पार्क (अब चंद्रशेखर आजाद पार्क) में ब्रिटिश पुलिस से मुठभेड़ के दौरान हुई।',
      },
      en: {
        question: 'Where did Chandrashekhar Azad die?',
        options: {
          A: 'Lahore Central Jail',
          B: 'Alfred Park, Allahabad',
          C: 'Feroz Shah Kotla',
          D: 'Kanpur',
          E: 'I do not want to answer',
        },
        explanation:
          'Chandrashekhar Azad died on 27 February 1931 at Alfred Park (now renamed Chandrashekhar Azad Park) in Allahabad, during an encounter with British police.',
      },
      correctOption: 'B',
    },
    {
      id: 'bss-031',
      category: 'Chandrashekhar Azad',
      hi: {
        question: 'चंद्रशेखर आजाद की मृत्यु किस वर्ष हुई?',
        options: {
          A: '1928',
          B: '1929',
          C: '1930',
          D: '1931',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          'चंद्रशेखर आजाद 27 फरवरी 1931 को इलाहाबाद के अल्फ्रेड पार्क में ब्रिटिश पुलिस से मुठभेड़ के दौरान शहीद हुए।',
      },
      en: {
        question: 'In which year did Chandrashekhar Azad die?',
        options: {
          A: '1928',
          B: '1929',
          C: '1930',
          D: '1931',
          E: 'I do not want to answer',
        },
        explanation:
          'Chandrashekhar Azad died on 27 February 1931 during an encounter with British police at Alfred Park, Allahabad.',
      },
      correctOption: 'D',
    },
    {
      id: 'bss-032',
      category: 'Chandrashekhar Azad',
      hi: {
        question: 'चंद्रशेखर आजाद के बारे में कौन-सा कथन सर्वाधिक सही है?',
        options: {
          A: 'वे ब्रिटिश पुलिस द्वारा जीवित गिरफ्तार कर लिए गए',
          B: 'उन्होंने गिरफ्तारी से बचने के लिए अंत तक संघर्ष किया',
          C: 'उन्हें Lahore Conspiracy Case में फांसी हुई',
          D: 'उन्होंने Simon Commission का नेतृत्व किया',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          'आजाद ने प्रतिज्ञा की थी कि वे कभी जीवित नहीं पकड़े जाएंगे। अल्फ्रेड पार्क में घिरने पर वे अकेले पुलिस से लड़े और अंतिम गोली से स्वयं को गोली मार ली ताकि गिरफ्तार न हों।',
      },
      en: {
        question: 'Which statement is most correct about Chandrashekhar Azad?',
        options: {
          A: 'He was captured alive by the British police',
          B: 'He fought till the end to avoid arrest',
          C: 'He was hanged in the Lahore Conspiracy Case',
          D: 'He led the Simon Commission',
          E: 'I do not want to answer',
        },
        explanation:
          "Azad had taken a vow never to be captured alive. When surrounded at Alfred Park, he fought the police alone and ultimately shot himself with the last bullet to avoid capture.",
      },
      correctOption: 'B',
    },
    {
      id: 'bss-033',
      category: 'Chandrashekhar Azad',
      hi: {
        question:
          'भगवती चरण वोहरा की मृत्यु किस गतिविधि से संबंधित दुर्घटना में हुई थी?',
        options: {
          A: 'जेल भूख हड़ताल',
          B: 'बम परीक्षण',
          C: 'सॉन्डर्स पर गोलीबारी',
          D: 'Simon Commission प्रदर्शन',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          'भगवती चरण वोहरा की मृत्यु 28 मई 1930 को लाहौर के पास रावी नदी के तट पर बम परीक्षण के दौरान हुई, जब बम समय से पहले फट गया।',
      },
      en: {
        question:
          'Bhagwati Charan Vohra died in an accident related to which activity?',
        options: {
          A: 'Jail hunger strike',
          B: 'Bomb testing',
          C: 'Firing on Saunders',
          D: 'Simon Commission protest',
          E: 'I do not want to answer',
        },
        explanation:
          'Bhagwati Charan Vohra was killed on 28 May 1930 when a bomb he was testing on the banks of the Ravi river near Lahore accidentally exploded prematurely.',
      },
      correctOption: 'B',
    },
    {
      id: 'bss-034',
      category: 'Chandrashekhar Azad',
      hi: {
        question:
          'चंद्रशेखर आजाद और भगत सिंह के बीच संबंध को सबसे सही तरीके से कैसे समझा जा सकता है?',
        options: {
          A: 'दोनों अलग और विरोधी संगठनों में थे',
          B: 'दोनों HSRA के क्रांतिकारी नेटवर्क के महत्वपूर्ण सदस्य थे',
          C: 'आजाद संवैधानिक राजनीति में थे और भगत सिंह क्रांतिकारी',
          D: 'दोनों कभी साथ कार्य नहीं करते थे',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          'आजाद और भगत सिंह दोनों HSRA के प्रमुख नेता थे और संगठन की क्रांतिकारी गतिविधियों की योजना और क्रियान्वयन में मिलकर कार्य करते थे।',
      },
      en: {
        question:
          'How can the relationship between Chandrashekhar Azad and Bhagat Singh most accurately be understood?',
        options: {
          A: 'Both were in separate and rival organisations',
          B: "Both were important members of the HSRA's revolutionary network",
          C: 'Azad was in constitutional politics and Bhagat Singh was a revolutionary',
          D: 'Both never worked together',
          E: 'I do not want to answer',
        },
        explanation:
          "Both Azad and Bhagat Singh were key leaders of the HSRA and worked closely together in planning and executing the organisation's revolutionary activities.",
      },
      correctOption: 'B',
    },
    {
      id: 'bss-035',
      category: 'Simon Commission',
      hi: {
        question:
          'Simon Commission की नियुक्ति किस ब्रिटिश सरकार द्वारा भारत में संवैधानिक सुधारों की समीक्षा हेतु की गई थी?',
        options: {
          A: 'लेबर सरकार',
          B: 'कंजरवेटिव सरकार',
          C: 'लिबरल सरकार',
          D: 'युद्धकालीन गठबंधन सरकार',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          'साइमन कमीशन की नियुक्ति 1927 में प्रधानमंत्री स्टेनली बाल्डविन की कंजरवेटिव सरकार द्वारा भारत में संवैधानिक कार्यप्रणाली की समीक्षा हेतु की गई।',
      },
      en: {
        question:
          'By which British government was the Simon Commission appointed to review constitutional reforms in India?',
        options: {
          A: 'Labour Government',
          B: 'Conservative Government',
          C: 'Liberal Government',
          D: 'Wartime Coalition Government',
          E: 'I do not want to answer',
        },
        explanation:
          'The Simon Commission was appointed in 1927 by the Conservative government led by Prime Minister Stanley Baldwin to review the working of the Indian Constitution.',
      },
      correctOption: 'B',
    },
    {
      id: 'bss-036',
      category: 'Simon Commission',
      hi: {
        question:
          'Simon Commission की सबसे अधिक आलोचना किस आधार पर हुई?',
        options: {
          A: 'उसमें बहुत अधिक भारतीय सदस्य थे',
          B: 'उसमें कोई भारतीय सदस्य नहीं था',
          C: 'उसने भारत आने से इनकार कर दिया',
          D: 'उसने पूर्ण स्वतंत्रता की सिफारिश की',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          'साइमन कमीशन की सबसे बड़ी आलोचना यह थी कि इसमें कोई भारतीय सदस्य नहीं था — सभी सात सदस्य ब्रिटिश थे। इससे सभी प्रमुख भारतीय दलों ने इसका बहिष्कार किया।',
      },
      en: {
        question: 'The Simon Commission was most heavily criticised on which grounds?',
        options: {
          A: 'It had too many Indian members',
          B: 'It had no Indian member',
          C: 'It refused to come to India',
          D: 'It recommended complete independence',
          E: 'I do not want to answer',
        },
        explanation:
          'The Simon Commission was boycotted by all major Indian political parties because it had no Indian member — all seven members were British.',
      },
      correctOption: 'B',
    },
    {
      id: 'bss-037',
      category: 'Simon Commission',
      hi: {
        question: 'Simon Commission में कुल कितने सदस्य थे?',
        options: {
          A: '5',
          B: '6',
          C: '7',
          D: '9',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          'साइमन कमीशन में कुल 7 सदस्य थे — सभी ब्रिटिश — जिसकी अध्यक्षता सर जॉन साइमन ने की।',
      },
      en: {
        question: 'What was the total number of members in the Simon Commission?',
        options: {
          A: '5',
          B: '6',
          C: '7',
          D: '9',
          E: 'I do not want to answer',
        },
        explanation:
          'The Simon Commission had seven members, all British, chaired by Sir John Simon.',
      },
      correctOption: 'C',
    },
    {
      id: 'bss-038',
      category: 'Simon Commission',
      hi: {
        question: 'Simon Commission भारत कब पहुँचा?',
        options: {
          A: '1927',
          B: '1928',
          C: '1929',
          D: '1930',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          'साइमन कमीशन फरवरी 1928 में भारत पहुँचा। इसके आगमन पर देशभर में व्यापक विरोध प्रदर्शन हुए।',
      },
      en: {
        question: 'When did the Simon Commission arrive in India?',
        options: {
          A: '1927',
          B: '1928',
          C: '1929',
          D: '1930',
          E: 'I do not want to answer',
        },
        explanation:
          'The Simon Commission arrived in India in February 1928, sparking widespread protest demonstrations across the country.',
      },
      correctOption: 'B',
    },
    {
      id: 'bss-039',
      category: 'Simon Commission',
      hi: {
        question:
          'Simon Commission के भारत आगमन पर सबसे प्रसिद्ध विरोधी नारा क्या था?',
        options: {
          A: 'अंग्रेजों भारत छोड़ो',
          B: 'Simon Go Back',
          C: 'पूर्ण स्वराज',
          D: 'इंकलाब जिंदाबाद',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          "'Simon Go Back' कमीशन के आगमन पर सर्वाधिक प्रसिद्ध विरोधी नारा बना, जो भारतीय प्रतिनिधित्व के बिना बनाई गई कमीशन के प्रति सर्वव्यापी भारतीय विरोध को दर्शाता था।",
      },
      en: {
        question:
          'What was the most famous protest slogan upon the arrival of the Simon Commission in India?',
        options: {
          A: 'Quit India',
          B: 'Simon Go Back',
          C: 'Poorna Swaraj',
          D: 'Inquilab Zindabad',
          E: 'I do not want to answer',
        },
        explanation:
          "'Simon Go Back' became the most famous protest slogan when the Commission arrived, reflecting the universal Indian opposition to a Commission with no Indian representation.",
      },
      correctOption: 'B',
    },
    {
      id: 'bss-040',
      category: 'Simon Commission',
      hi: {
        question:
          'लाहौर में Simon Commission विरोधी प्रदर्शन का नेतृत्व किसने किया?',
        options: {
          A: 'भगत सिंह',
          B: 'चंद्रशेखर आजाद',
          C: 'लाला लाजपत राय',
          D: 'जवाहरलाल नेहरू',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          'लाला लाजपत राय ने 30 अक्टूबर 1928 को लाहौर में साइमन कमीशन विरोधी प्रदर्शन का नेतृत्व किया, जिसके दौरान क्रूर लाठीचार्ज हुआ।',
      },
      en: {
        question:
          'Who led the anti-Simon Commission demonstration in Lahore?',
        options: {
          A: 'Bhagat Singh',
          B: 'Chandrashekhar Azad',
          C: 'Lala Lajpat Rai',
          D: 'Jawaharlal Nehru',
          E: 'I do not want to answer',
        },
        explanation:
          'Lala Lajpat Rai led the anti-Simon Commission demonstration in Lahore on 30 October 1928, during which a brutal lathi-charge by police took place.',
      },
      correctOption: 'C',
    },
    {
      id: 'bss-041',
      category: 'Simon Commission',
      hi: {
        question: 'लाला लाजपत राय पर लाठीचार्ज किस संदर्भ में हुआ था?',
        options: {
          A: 'Assembly Bomb Case',
          B: 'Simon Commission विरोध प्रदर्शन',
          C: 'काकोरी कांड',
          D: 'HSRA की स्थापना',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          'लाला लाजपत राय पर लाठीचार्ज लाहौर में साइमन कमीशन विरोध प्रदर्शन के दौरान हुआ। इससे लगी चोटों के कारण उनकी 17 नवंबर 1928 को मृत्यु हो गई।',
      },
      en: {
        question:
          'In which context did the lathi-charge on Lala Lajpat Rai take place?',
        options: {
          A: 'Assembly Bomb Case',
          B: 'Simon Commission protest demonstration',
          C: 'Kakori incident',
          D: 'Formation of HSRA',
          E: 'I do not want to answer',
        },
        explanation:
          'The lathi-charge on Lala Lajpat Rai took place during the Simon Commission protest demonstrations in Lahore. He died from the injuries on 17 November 1928.',
      },
      correctOption: 'B',
    },
    {
      id: 'bss-042',
      category: 'Chronology',
      hi: {
        question:
          'निम्न घटनाओं का सही क्रम चुनिए:\n1. Simon Commission का भारत आगमन\n2. लाला लाजपत राय पर लाठीचार्ज\n3. सॉन्डर्स की हत्या\n4. Central Legislative Assembly Bomb Case',
        options: {
          A: '1-2-3-4',
          B: '2-1-3-4',
          C: '1-3-2-4',
          D: '3-1-2-4',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          'सही क्रम: Simon Commission का भारत आगमन (फरवरी 1928) → लाठीचार्ज (अक्टूबर 1928) → सॉन्डर्स की हत्या (दिसंबर 1928) → Assembly Bomb Case (अप्रैल 1929)।',
      },
      en: {
        question:
          'Choose the correct chronological order of the following events:\n1. Arrival of Simon Commission in India\n2. Lathi-charge on Lala Lajpat Rai\n3. Assassination of Saunders\n4. Central Legislative Assembly Bomb Case',
        options: {
          A: '1-2-3-4',
          B: '2-1-3-4',
          C: '1-3-2-4',
          D: '3-1-2-4',
          E: 'I do not want to answer',
        },
        explanation:
          'Correct order: Simon Commission arrived in India (February 1928) → Lathi-charge on Lala Lajpat Rai (October 1928) → Saunders assassination (December 1928) → Assembly Bomb Case (April 1929).',
      },
      correctOption: 'A',
    },
    {
      id: 'bss-043',
      category: 'Chronology',
      hi: {
        question: 'निम्नलिखित घटनाओं में कौन-सी 1929 में हुई थी?',
        options: {
          A: 'सॉन्डर्स की हत्या',
          B: 'Simon Commission की भारत यात्रा की शुरुआत',
          C: 'Central Legislative Assembly Bomb Case',
          D: 'चंद्रशेखर आजाद की मृत्यु',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          'Central Legislative Assembly Bomb Case 8 अप्रैल 1929 को हुआ। सॉन्डर्स की हत्या दिसंबर 1928 में, Simon Commission 1928 में आया, और आजाद की मृत्यु 1931 में हुई।',
      },
      en: {
        question: 'Which of the following events occurred in 1929?',
        options: {
          A: 'Assassination of Saunders',
          B: "Commencement of Simon Commission's India visit",
          C: 'Central Legislative Assembly Bomb Case',
          D: 'Death of Chandrashekhar Azad',
          E: 'I do not want to answer',
        },
        explanation:
          'The Central Legislative Assembly Bomb Case occurred on 8 April 1929. The Saunders assassination was in December 1928; Simon Commission arrived in 1928; Azad died in 1931.',
      },
      correctOption: 'C',
    },
    {
      id: 'bss-044',
      category: 'Statement-Based',
      hi: {
        question:
          'निम्न कथनों पर विचार कीजिए:\n1. Simon Commission पूर्णतः ब्रिटिश सदस्यों से बना था।\n2. कांग्रेस ने इसका बहिष्कार किया।\n3. लाहौर में इसके विरोध से जुड़े प्रदर्शन में लाला लाजपत राय घायल हुए।\nसही विकल्प चुनिए:',
        options: {
          A: 'केवल 1',
          B: 'केवल 1 और 2',
          C: 'केवल 2 और 3',
          D: '1, 2 और 3',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          'तीनों कथन सही हैं: (1) कमीशन में केवल ब्रिटिश सदस्य थे; (2) कांग्रेस ने इसका बहिष्कार किया; (3) लाला लाजपत राय लाहौर प्रदर्शन में घायल हुए।',
      },
      en: {
        question:
          'Consider the following statements:\n1. The Simon Commission was composed entirely of British members.\n2. The Congress boycotted it.\n3. Lala Lajpat Rai was injured in the demonstration connected with the protest against it in Lahore.\nChoose the correct option:',
        options: {
          A: 'Only 1',
          B: 'Only 1 and 2',
          C: 'Only 2 and 3',
          D: '1, 2, and 3',
          E: 'I do not want to answer',
        },
        explanation:
          'All three statements are correct: (1) The Commission had only British members; (2) Congress boycotted it; (3) Lala Lajpat Rai was injured during the Lahore protest.',
      },
      correctOption: 'D',
    },
    {
      id: 'bss-045',
      category: 'Statement-Based',
      hi: {
        question:
          'निम्न कथनों पर विचार कीजिए:\n1. Saunders assassination सीधे Simon Commission की नियुक्ति के विरोध में नहीं, बल्कि लाला लाजपत राय की मृत्यु का बदला लेने से जुड़ा था।\n2. वास्तविक लक्ष्य Scott था।\n3. Saunders को पहचान की भूल के कारण निशाना बनाया गया।\nसही उत्तर है:',
        options: {
          A: 'केवल 1',
          B: 'केवल 1 और 2',
          C: 'केवल 2 और 3',
          D: '1, 2 और 3',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          'तीनों कथन सही हैं: (1) सॉन्डर्स हत्या लाजपत राय की मृत्यु का बदला थी; (2) Scott वास्तविक लक्ष्य था; (3) पहचान की भूल के कारण सॉन्डर्स मारे गए।',
      },
      en: {
        question:
          'Consider the following statements:\n1. The Saunders assassination was not directly in protest against the appointment of the Simon Commission, but was connected to avenging the death of Lala Lajpat Rai.\n2. The actual target was Scott.\n3. Saunders was targeted due to a case of mistaken identity.\nThe correct answer is:',
        options: {
          A: 'Only 1',
          B: 'Only 1 and 2',
          C: 'Only 2 and 3',
          D: '1, 2, and 3',
          E: 'I do not want to answer',
        },
        explanation:
          'All three statements are correct: (1) Saunders assassination was revenge for Lajpat Rai\'s death; (2) Scott was the actual target; (3) Saunders was shot due to mistaken identity.',
      },
      correctOption: 'D',
    },
    {
      id: 'bss-046',
      category: 'Matching / Mismatched Pair',
      hi: {
        question:
          'निम्न में से कौन-सा युग्म गलत सुमेलित है?',
        options: {
          A: 'John Simon — Simon Commission',
          B: 'J.P. Saunders — Lahore police officer',
          C: 'Batukeshwar Dutt — Assembly Bomb Case',
          D: 'Jatin Das — Alfred Park encounter',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          'युग्म D गलत है। जतिन दास की मृत्यु जेल में भूख हड़ताल के दौरान हुई, न कि Alfred Park मुठभेड़ में। Alfred Park मुठभेड़ में चंद्रशेखर आजाद शहीद हुए थे।',
      },
      en: {
        question:
          'Which of the following pairs is incorrectly matched?',
        options: {
          A: 'John Simon — Simon Commission',
          B: 'J.P. Saunders — Lahore police officer',
          C: 'Batukeshwar Dutt — Assembly Bomb Case',
          D: 'Jatin Das — Alfred Park encounter',
          E: 'I do not want to answer',
        },
        explanation:
          'Pair D is incorrectly matched. Jatin Das died during the hunger strike in jail, not in the Alfred Park encounter. It was Chandrashekhar Azad who died in the Alfred Park encounter.',
      },
      correctOption: 'D',
    },
    {
      id: 'bss-047',
      category: 'Chronology',
      hi: {
        question: 'कौन-सा युग्म सही कालक्रम में है?',
        options: {
          A: 'Saunders हत्या → Simon Commission भारत आगमन',
          B: 'Assembly Bomb Case → Saunders हत्या',
          C: 'Simon Commission विरोध → Saunders हत्या',
          D: 'आजाद की मृत्यु → भगत सिंह की फांसी → Assembly Bomb Case',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          'सही युग्म C है: Simon Commission विरोध (अक्टूबर 1928) → Saunders हत्या (दिसंबर 1928)। A गलत है (Simon Commission पहले आया); B गलत है (Assembly Bomb Case बाद में हुआ); D गलत है (Assembly Bomb Case 1929 में था)।',
      },
      en: {
        question: 'Which pair is in correct chronological order?',
        options: {
          A: 'Saunders assassination → Simon Commission\'s arrival in India',
          B: 'Assembly Bomb Case → Saunders assassination',
          C: 'Simon Commission protest → Saunders assassination',
          D: 'Azad\'s death → Bhagat Singh\'s hanging → Assembly Bomb Case',
          E: 'I do not want to answer',
        },
        explanation:
          'Correct pair is C: Simon Commission protest (October 1928) preceded Saunders assassination (December 1928). A is wrong (Simon Commission arrived before Saunders was killed); B is wrong (Assembly Bomb Case came after Saunders); D is wrong (Assembly Bomb Case was in 1929, before both deaths).',
      },
      correctOption: 'C',
    },
    {
      id: 'bss-048',
      category: 'Analysis',
      hi: {
        question:
          'भगत सिंह और चंद्रशेखर आजाद की क्रांतिकारी रणनीति में एक महत्वपूर्ण समानता क्या थी?',
        options: {
          A: 'दोनों केवल संवैधानिक सुधार चाहते थे',
          B: 'दोनों औपनिवेशिक शासन को समाप्त कर क्रांतिकारी राजनीतिक व्यवस्था स्थापित करना चाहते थे',
          C: 'दोनों सांप्रदायिक राजनीति को प्राथमिकता देते थे',
          D: 'दोनों ब्रिटिश विधान परिषद में प्रवेश को मुख्य साधन मानते थे',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          'भगत सिंह और आजाद दोनों औपनिवेशिक शासन को समाप्त करने और एक क्रांतिकारी, समतामूलक राजनीतिक व्यवस्था की स्थापना के लिए प्रतिबद्ध थे।',
      },
      en: {
        question:
          'What was an important similarity in the revolutionary strategy of Bhagat Singh and Chandrashekhar Azad?',
        options: {
          A: 'Both wanted constitutional reforms only',
          B: 'Both wanted to end colonial rule and establish a revolutionary political order',
          C: 'Both prioritised communal politics',
          D: 'Both considered entry into the British Legislative Council as the primary means',
          E: 'I do not want to answer',
        },
        explanation:
          'Both Bhagat Singh and Azad were committed to ending colonial rule and establishing a revolutionary, egalitarian political order through armed struggle.',
      },
      correctOption: 'B',
    },
    {
      id: 'bss-049',
      category: 'Analysis',
      hi: {
        question: 'निम्न कथनों में से कौन-सा सबसे अधिक सटीक है?',
        options: {
          A: 'Simon Commission विरोध और HSRA गतिविधियों के बीच कोई ऐतिहासिक संबंध नहीं था',
          B: 'Simon Commission विरोध के दौरान लाला लाजपत राय पर हुए लाठीचार्ज ने बाद में Saunders assassination की पृष्ठभूमि तैयार की',
          C: 'Saunders Simon Commission का सदस्य था',
          D: 'भगत सिंह Simon Commission के भारतीय सदस्य थे',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          'साइमन कमीशन विरोध के दौरान लाला लाजपत राय पर हुए लाठीचार्ज (अक्टूबर 1928) और उनकी बाद में मृत्यु (नवंबर 1928) ने सीधे Saunders assassination (दिसंबर 1928) की पृष्ठभूमि तैयार की।',
      },
      en: {
        question: 'Which of the following statements is most accurate?',
        options: {
          A: 'There was no historical connection between the Simon Commission protests and HSRA activities',
          B: 'The lathi-charge on Lala Lajpat Rai during the Simon Commission protests later prepared the background for the Saunders assassination',
          C: 'Saunders was a member of the Simon Commission',
          D: 'Bhagat Singh was an Indian member of the Simon Commission',
          E: 'I do not want to answer',
        },
        explanation:
          'The lathi-charge on Lala Lajpat Rai (October 1928) and his subsequent death (November 1928) during the Simon Commission protests directly motivated the Saunders assassination (December 1928).',
      },
      correctOption: 'B',
    },
    {
      id: 'bss-050',
      category: 'Chronology',
      hi: {
        question:
          'निम्न घटनाओं का सही कालक्रम चुनिए:\n1. HSRA का पुनर्गठन\n2. Saunders assassination\n3. Assembly Bomb Case\n4. Chandrashekhar Azad की मृत्यु\n5. Bhagat Singh, Rajguru और Sukhdev की फांसी',
        options: {
          A: '1-2-3-4-5',
          B: '2-1-3-5-4',
          C: '1-3-2-4-5',
          D: '2-3-1-5-4',
          E: 'उत्तर नहीं देना चाहता',
        },
        explanation:
          'सही क्रम: HSRA पुनर्गठन (1928) → Saunders assassination (दिसंबर 1928) → Assembly Bomb Case (अप्रैल 1929) → Azad की मृत्यु (27 फरवरी 1931) → भगत सिंह, राजगुरु व सुखदेव की फांसी (23 मार्च 1931)।',
      },
      en: {
        question:
          'Choose the correct chronological order of the following events:\n1. Reorganisation of HSRA\n2. Saunders assassination\n3. Assembly Bomb Case\n4. Death of Chandrashekhar Azad\n5. Hanging of Bhagat Singh, Rajguru, and Sukhdev',
        options: {
          A: '1-2-3-4-5',
          B: '2-1-3-5-4',
          C: '1-3-2-4-5',
          D: '2-3-1-5-4',
          E: 'I do not want to answer',
        },
        explanation:
          'Correct order: HSRA reorganisation (1928) → Saunders assassination (December 1928) → Assembly Bomb Case (April 1929) → Death of Azad (27 February 1931) → Hanging of Bhagat Singh, Rajguru, Sukhdev (23 March 1931).',
      },
      correctOption: 'A',
    },
  ],
};

export default test;
