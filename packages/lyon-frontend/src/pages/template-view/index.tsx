import { useToast } from '@chakra-ui/react'
import Checkbox from 'components/checkbox'
import CommonLayout from 'components/common-layout'
import styles from './index.module.scss'
import TemplateTree from 'components/template-tree'
import TemplateTrend from 'components/template-trend'
import { useEffect, useState } from 'react'
import { useWeb3React } from '@web3-react/core'
import { Contract } from '@ethersproject/contracts'
import LyonPrompt from 'contracts/LyonPrompt.json'
import LyonTemplate from 'contracts/LyonTemplate.json'
import {
  firestore,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  serverTimestamp,
} from '../../firebase'
import { ethers } from 'ethers'
import { useParams } from 'react-router-dom'
import { confirmAlert } from 'react-confirm-alert'
import 'react-confirm-alert/src/react-confirm-alert.css'
import PopupProps from 'components/popup'
import { useSigner, useAccount } from 'wagmi'

const TemplateViewPage = () => {
  const [question, setQuestion] = useState('')
  const [questionContext, setQuestionContext] = useState('')
  const [questionNumAnswers, setQuestionNumAnswers] = useState(0)
  const [chainId, setChainId] = useState(80001)
  const toast = useToast()
  const context = useWeb3React()
  // const { library, account, chainId } = context
  const { templateId } = useParams<{ templateId: string }>()
  const provider = new ethers.providers.JsonRpcProvider(
    'https://rpc-mumbai.maticvigil.com/v1/59e3a028aa7f390b9b604fae35aab48985ebb2f0',
  )
  const { data: signer, isError, isLoading } = useSigner()
  const { address, isConnecting, isDisconnected } = useAccount()

  const submit = () => {
    confirmAlert({
      title: 'Confirm to mint',
      message: 'Are you sure to do this?',
      buttons: [
        {
          label: 'Yes',
          onClick: () => alert('Click Yes'),
          // onClick={() => {
          //   handleMintPrompt()
          // }}
        },
        {
          label: 'No',
          onClick: () => alert('Click No'),
        },
      ],
      //NFTSBT: <NFTSBTBox question={question} replyShow={''} />,
    })
  }

  // const popup =() => {
  //   render{
  //     <PopupProps/>
  // }}

  useEffect(() => {
    const loadTemplateData = async () => {
      const templateMetadataRef = doc(
        firestore,
        'template-metadata',
        templateId!,
      )
      const templateSnapshot = await getDoc(templateMetadataRef)
      const fetchedData = templateSnapshot.data()
      if (fetchedData !== undefined) {
        setQuestion(fetchedData.question)
        setQuestionContext(fetchedData.context)
        setQuestionNumAnswers(fetchedData.numAnswers)
      }
    }

    provider.getNetwork().then((network: any) => {
      setChainId(network.chainId)
    })

    loadTemplateData()
  }, [])

  const handleSwitchNetwork = async (networkId: number) => {
    try {
      if ((window as any).web3?.currentProvider) {
        await (window as any).web3.currentProvider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${networkId.toString(16)}` }],
        })
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message
          ? `${error.message.substring(0, 120)}...`
          : 'Please switch to Mumbai testnet to proceed the payment',
        status: 'error',
        duration: 9000,
        isClosable: true,
      })
    }
  }
  const handleMintPrompt = async () => {
    try {
      if (provider && signer && chainId) {
        if (chainId !== 80001) {
          await handleSwitchNetwork(80001)
          return
        }
        const LyonPromptContract = new Contract(
          '0xa10fefdB2BE52BBC287B57F08C2509EdD1a11AdE',
          LyonPrompt.abi,
          signer,
        )
        const LyonTemplateContract = new Contract(
          '0x22f0260F47f98968A262DcAe17d981e63a6a7455',
          LyonTemplate.abi,
          signer,
        )
        const promptSafeMintResponse = await LyonPromptContract.safeMint(
          templateId,
          question,
          questionContext,
          address,
          '',
        ) //TODO: add uri
        const promptSafeMintResponseHash = promptSafeMintResponse.hash // TODO store hash
        console.log('promptSafeMintResponse', promptSafeMintResponse)
        const questionNumAnswersAdded = questionNumAnswers + 1

        const templateRef = doc(firestore, 'template-metadata', templateId!)
        getDoc(templateRef).then(snapshot => {
          const fetchedData = snapshot.data()?.trend
          const currentYear = new Date().getFullYear()
          const currentMonth = new Date().getMonth() + 1
          const currentTime = [currentYear, currentMonth].join('-')
          if (fetchedData !== undefined) {
            updateDoc(templateRef, {
              trend: {
                // ...fetchedData, // TODO check
                [currentTime]:
                  fetchedData[currentTime] !== undefined
                    ? fetchedData[currentTime] + 1
                    : 1,
              },
              numAnswers: questionNumAnswersAdded,
            })
            // setQuestionNumAnswers(questionNumAnswers + 1)
          }
        })

        const promptMetadataRef = doc(firestore, 'prompt-metadata', templateId!)
        getDoc(promptMetadataRef).then(snapshot => {
          const promptData = {
            promptOwner: address,
            question: question,
            context: questionContext,
            replies: {},
            keys: [],
            createTime: serverTimestamp(),
            SBTURI: '', // TODO add uri
          }

          if (snapshot.exists()) {
            updateDoc(promptMetadataRef, {
              [questionNumAnswersAdded.toString()]: promptData,
            })
          } else {
            setDoc(promptMetadataRef, {
              [questionNumAnswersAdded.toString()]: promptData,
            })
          }
        })
      }
    } catch (error: any) {
      toast({
        title: 'Ask Error',
        description: error.reason,
        status: 'error',
        duration: 9000,
        isClosable: true,
      })
    }
  }

  return question !== '' && questionContext !== '' ? (
    <CommonLayout className={styles.page}>
      <div className={styles.content}>
        <div className={styles.heading}>{question}</div>
        <div className={styles.heading}>{questionContext}</div>
        <div className={styles.charts}>
          <div className={styles.stats}>
            <TemplateTrend templateId={templateId!} />
          </div>
          <div className={styles.graph}>
            <TemplateTree templateId={templateId!} />
          </div>
        </div>
        <div className={styles.buttons}>
          <div className={styles.cancel} onClick={() => window.history.back()}>
            Back
          </div>
          <div
            className={styles.confirm}
            // onClick={submit}
            onClick={() => {
              handleMintPrompt()
            }}
          >
            Ask the question
          </div>
        </div>
      </div>
    </CommonLayout>
  ) : null
}

export default TemplateViewPage
