import { useToast } from '@chakra-ui/react'
import Checkbox from 'components/checkbox'
import CommonLayout from 'components/common-layout'
import { ethers } from 'ethers'
import { useEffect, useState } from 'react'
import styles from './index.module.scss'
import { useSigner, useAccount } from 'wagmi'
import { Contract } from '@ethersproject/contracts'
import LyonTemplate from 'contracts/LyonTemplate.json'
import {
  firestore,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  serverTimestamp,
  collection,
  databaseGet,
} from '../../firebase'

const TemplateCreatePage = () => {
  const [templateQuestion, setTemplateQuestion] = useState('')
  const [templateContext, setTemplateContext] = useState('')
  const [templateId, setTemplateId] = useState(0)
  const [chainId, setChainId] = useState(80001)

  const toast = useToast()

  const provider = new ethers.providers.JsonRpcProvider(
    'https://rpc-mumbai.maticvigil.com/v1/59e3a028aa7f390b9b604fae35aab48985ebb2f0',
  )
  const { data: signer, isError, isLoading } = useSigner()
  const { address, isConnecting, isDisconnected } = useAccount()

  useEffect(() => {
    provider.getNetwork().then((network: any) => {
      setChainId(network.chainId)
    })
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

  const handleMintTemplate = async () => {
    try {
      if (provider && signer && chainId) {
        if (chainId !== 80001) {
          await handleSwitchNetwork(80001)
          return
        }
        const LyonTemplateContract = new Contract(
          '0x15f6682adC43ff249F645Cd6e121D2109632313e',
          LyonTemplate.abi,
          signer,
        )
        const promptSafeMintResponse = await LyonTemplateContract.mintTemplate(
          templateQuestion,
          templateContext,
          '',
        ) //TODO: add uri
        const promptSafeMintResponseHash = promptSafeMintResponse.hash // TODO store hash
        console.log('promptSafeMintResponse', promptSafeMintResponse)

        const templateMetadataRef = doc(
          firestore,
          'template-metadata',
          'global',
        )
        const templateMetadataSnapshot = await getDoc(templateMetadataRef)
        const fetchedData = templateMetadataSnapshot.data()
        const templateCount = fetchedData?.count + 1
        updateDoc(templateMetadataRef, {
          count: templateCount,
        }).then(() => {
          setTemplateId(templateCount)
          const templateRef = doc(
            firestore,
            'template-metadata',
            templateId!.toString(),
          )
          setDoc(templateRef, {
            question: templateQuestion,
            context: templateContext,
            ownerAddress: address,
            numAnswers: 0,
            trend: {},
            connections: [],
            createTime: serverTimestamp(),
          })
          console.log('templateId', templateId)
        })
      }
    } catch (error: any) {
      toast({
        title: 'Mint Error',
        description: error.reason,
        status: 'error',
        duration: 9000,
        isClosable: true,
      })
    }
  }

  return (
    <CommonLayout className={styles.page}>
      <div className={styles.heading}>Create a new prompt template</div>
      <div className={styles.description}>
        Each template is an NFT, you can trade it like any other NFT.
      </div>
      <textarea
        className={styles.textarea}
        placeholder="What do you want to ask?"
        value={templateQuestion}
        onChange={event =>
          setTemplateQuestion(event.target.value.replace(/\n/g, ''))
        }
      />
      <textarea
        className={styles.textarea}
        placeholder="context"
        value={templateContext}
        onChange={event =>
          setTemplateContext(event.target.value.replace(/\n/g, ''))
        }
      />
      <div className={styles.options}>
        <div className={styles.description}>
          Your frenz can respond either Yes, No, or I don't know to your prompt.
        </div>
      </div>
      <div className={styles.buttons}>
        <div className={styles.cancel} onClick={() => window.history.back()}>
          Cancel
        </div>
        <div className={styles.confirm} onClick={() => handleMintTemplate()}>
          Mint
        </div>
      </div>
    </CommonLayout>
  )
}

export default TemplateCreatePage
