use starknet::ContractAddress;

#[starknet::interface]
pub trait IDex<TContractState> {
    /// Initializes the DEX with the specified amounts of tokens and STRK.
    ///
    /// Args:
    ///     self: The contract state.
    ///     tokens: The amount of tokens to initialize the DEX with.
    ///     strk: The amount of STRK to initialize the DEX with.
    ///
    /// Returns:
    ///     (u256, u256): The amounts of tokens and STRK initialized.
    fn init(ref self: TContractState, tokens: u256, strk: u256) -> (u256, u256);

    /// Calculates the price based on the input amount and reserves.
    ///
    /// Args:
    ///     self: The contract state.
    ///     x_input: The input amount of tokens.
    ///     x_reserves: The reserve amount of tokens.
    ///     y_reserves: The reserve amount of STRK.
    ///
    /// Returns:
    ///     u256: The output amount of STRK.
    fn price(self: @TContractState, x_input: u256, x_reserves: u256, y_reserves: u256) -> u256;

    /// Returns the liquidity for the specified address.
    ///
    /// Args:
    ///     self: The contract state.
    ///     lp_address: The address of the liquidity provider.
    ///
    /// Returns:
    ///     u256: The liquidity amount.
    fn get_liquidity(self: @TContractState, lp_address: ContractAddress) -> u256;

    /// Returns the total liquidity in the DEX.
    ///
    /// Args:
    ///     self: The contract state.
    ///
    /// Returns:
    ///     u256: The total liquidity amount.
    fn get_total_liquidity(self: @TContractState) -> u256;

    /// Swaps STRK for tokens.
    ///
    /// Args:
    ///     self: The contract state.
    ///     strk_input: The amount of STRK to swap.
    ///
    /// Returns:
    ///     u256: The amount of tokens received.
    fn strk_to_token(ref self: TContractState, strk_input: u256) -> u256;

    /// Swaps tokens for STRK.
    ///
    /// Args:
    ///     self: The contract state.
    ///     token_input: The amount of tokens to swap.
    ///
    /// Returns:
    ///     u256: The amount of STRK received.
    fn token_to_strk(ref self: TContractState, token_input: u256) -> u256;

    /// Deposits STRK and tokens into the liquidity pool.
    ///
    /// Args:
    ///     self: The contract state.
    ///     strk_amount: The amount of STRK to deposit.
    ///
    /// Returns:
    ///     u256: The amount of liquidity minted.
    fn deposit(ref self: TContractState, strk_amount: u256) -> u256;

    /// get deposit token amount when deposit strk_amount STRK.
    ///
    /// Args:
    ///     self: The contract state.
    ///     strk_amount: The amount of STRK to deposit.
    ///
    /// Returns:
    ///     u256: The token amount of the deposit.
    fn get_deposit_token_amount(self: @TContractState, strk_amount: u256) -> u256;

    /// Withdraws STRK and tokens from the liquidity pool.
    ///
    /// Args:
    ///     self: The contract state.
    ///     amount: The amount of liquidity to withdraw.
    ///
    /// Returns:
    ///     (u256, u256): The amounts of STRK and tokens withdrawn.
    fn withdraw(ref self: TContractState, amount: u256) -> (u256, u256);
}

#[starknet::contract]
mod Dex {
    // use contracts::Buns::{IBunsDispatcher, IBunsDispatcherTrait};
    use openzeppelin_access::ownable::OwnableComponent;
    use openzeppelin_token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
    use starknet::storage::{
        Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess,
        StoragePointerWriteAccess,
    };
    use starknet::{ContractAddress, get_caller_address, get_contract_address};
    use super::IDex;

    component!(path: OwnableComponent, storage: ownable, event: OwnableEvent);

    const TokensPerStrk: u256 = 100;

    #[abi(embed_v0)]
    impl OwnableImpl = OwnableComponent::OwnableImpl<ContractState>;
    impl OwnableInternalImpl = OwnableComponent::InternalImpl<ContractState>;

    #[storage]
    struct Storage {
        #[substorage(v0)]
        ownable: OwnableComponent::Storage,
        strk_token: IERC20Dispatcher,
        token: IERC20Dispatcher,
        total_liquidity: u256,
        liquidity: Map<ContractAddress, u256>,
    }

    // Todo Checkpoint 4:  Define the events.
    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        OwnableEvent: OwnableComponent::Event,
        StrkToTokenSwap: StrkToTokenSwap,
        TokenToStrkSwap: TokenToStrkSwap,
        LiquidityProvided: LiquidityProvided,
        LiquidityRemoved: LiquidityRemoved,
    }

    /// Event emitted when a STRK to token swap occurs.
    #[derive(Drop, starknet::Event)]
    struct StrkToTokenSwap {
        swapper: ContractAddress,
        token_output: u256,
        strk_input: u256,
    }

    /// Event emitted when a token to STRK swap occurs.
    #[derive(Drop, starknet::Event)]
    struct TokenToStrkSwap {
        swapper: ContractAddress,
        tokens_input: u256,
        strk_output: u256,
    }

    /// Event emitted when liquidity is provided to the DEX.
    #[derive(Drop, starknet::Event)]
    struct LiquidityProvided {
        liquidity_provider: ContractAddress,
        liquidity_minted: u256,
        strk_input: u256,
        tokens_input: u256,
    }

    /// Event emitted when liquidity is removed from the DEX.
    #[derive(Drop, starknet::Event)]
    struct LiquidityRemoved {
        liquidity_remover: ContractAddress,
        liquidity_withdrawn: u256,
        tokens_output: u256,
        strk_output: u256,
    }

    /// Constructor for the Dex contract.
    ///
    /// Initializes the contract with the specified STRK and token addresses.
    ///
    /// Args:
    ///     self: The contract state.
    ///     strk_token_address: The address of the STRK token contract.
    ///     token_address: The address of the token contract.
    #[constructor]
    fn constructor(
        ref self: ContractState,
        strk_token_address: ContractAddress,
        token_address: ContractAddress,
        owner: ContractAddress,
    ) {
        self.ownable.initializer(owner);
        self.strk_token.write(IERC20Dispatcher { contract_address: strk_token_address });
        self.token.write(IERC20Dispatcher { contract_address: token_address });
    }

    #[abi(embed_v0)]
    impl DexImpl of IDex<ContractState> {
        // Todo Checkpoint 2:  Implement your function init here.
        /// Initializes the DEX with the specified amounts of tokens and STRK.
        ///
        /// Args:
        ///     self: The contract state.
        ///     tokens: The amount of tokens to initialize the DEX with.
        ///     strk: The amount of STRK to initialize the DEX with.
        ///
        /// Returns:
        ///     (u256, u256): The amounts of tokens and STRK initialized.
        fn init(ref self: ContractState, tokens: u256, strk: u256) -> (u256, u256) {
         //   assert(!self.initialized.read(), 'DEX already initialized');

    // Ensure non-zero amounts
        assert(tokens > 0, 'Tokens must be non-zero');
        assert(strk > 0, 'STRK must be non-zero');
            self.token.read().transfer_from(
                get_caller_address(),
                get_contract_address(),
                tokens,
            );
            self.strk_token.read().transfer_from(   
                get_caller_address(),
                get_contract_address(),
                strk,
            );
            self.total_liquidity.write(strk);
            self.liquidity.write(get_caller_address(), strk);
            (tokens, strk)
        }

        // Todo Checkpoint 3:  Implement your function price here.
        /// Calculates the price based on the input amount and reserves.
        ///
        /// Args:
        ///     self: The contract state.
        ///     x_input: The input amount of tokens.
        ///     x_reserves: The reserve amount of tokens.
        ///     y_reserves: The reserve amount of STRK.
        ///
        /// Returns:
        ///     u256: The output amount of STRK.
        fn price(self: @ContractState, x_input: u256, x_reserves: u256, y_reserves: u256) -> u256 {

        assert(x_reserves > 0, 'Insufficient token reserves');
        assert(y_reserves > 0, 'Insufficient STRK reserves');
        

        assert(x_input > 0, 'Input amount must be non-zero');

        let fee_multiplier = 997;
        let fee_denominator = 1000;
        let x_input_after_fee = (x_input * fee_multiplier) / fee_denominator;

        // Constant product formula: (x_reserves * y_reserves) = k
        // After adding x_input_after_fee to x_reserves, calculate y_output
        // (x_reserves + x_input_after_fee) * (y_reserves - y_output) = x_reserves * y_reserves
        // y_output = y_reserves - (x_reserves * y_reserves) / (x_reserves + x_input_after_fee)
        
        let numerator = x_input_after_fee * y_reserves;
        let denominator = x_reserves + x_input_after_fee;
        
        assert(denominator > 0, 'Invalid denominator');

       
        let y_output = numerator / denominator;


        
        assert(y_output > 0, 'Output amount too small');

        y_output
        }

        // Todo Checkpoint 5:  Implement your function get_liquidity here.
        /// Returns the liquidity for the specified address.
        ///
        /// Args:
        ///     self: The contract state.
        ///     lp_address: The address of the liquidity provider.
        ///
        /// Returns:
        ///     u256: The liquidity amount.
        fn get_liquidity(self: @ContractState, lp_address: ContractAddress) -> u256 {
            
            self.liquidity.read(lp_address)

        }

        // Todo Checkpoint 5:  Implement your function get_total_liquidity here.
        /// Returns the total liquidity in the DEX.
        ///
        /// Args:
        ///     self: The contract state.
        ///
        /// Returns:
        ///     u256: The total liquidity amount.
        fn get_total_liquidity(self: @ContractState) -> u256 {
            self.total_liquidity.read()
        }

        // Todo Checkpoint 4:  Implement your function strk_to_token here.
        /// Swaps STRK for tokens.
        ///
        /// Args:
        ///     self: The contract state.
        ///     strk_input: The amount of STRK to swap.
        ///
        /// Returns:
        ///     u256: The amount of tokens received.
        fn strk_to_token(ref self: ContractState, strk_input: u256) -> u256 {
            let caller = get_caller_address();
            let contract_address = get_contract_address();

            let strk_reserves = self.strk_token.read().balance_of(contract_address);
            let token_reserves = self.token.read().balance_of(contract_address);

            assert(strk_input > 0, 'STRK input must be non-zero');
            assert(strk_reserves > 0, 'Insufficient STRK reserves');
            assert(token_reserves > 0, 'Insufficient token reserves');

            let token_output = self.price(strk_input, strk_reserves, token_reserves);

            assert(token_output > 0, 'Token output must be non-zero');

            self.strk_token.read().transfer_from(caller, contract_address, strk_input);
            self.token.read().transfer(caller, token_output);

            self.emit(Event::StrkToTokenSwap(StrkToTokenSwap {
                swapper: caller,
                token_output,
                strk_input,
            }));

            token_output
        }

        // Todo Checkpoint 4:  Implement your function token_to_strk here.
        /// Swaps tokens for STRK.
        ///
        /// Args:
        ///     self: The contract state.
        ///     token_input: The amount of tokens to swap.
        ///
        /// Returns:
        ///     u256: The amount of STRK received.
        fn token_to_strk(ref self: ContractState, token_input: u256) -> u256 {
            let caller = get_caller_address();
            let contract_address = get_contract_address();

            let strk_reserves = self.strk_token.read().balance_of(contract_address);
            let token_reserves = self.token.read().balance_of(contract_address);

            assert(token_input > 0, 'Token input must be non-zero');
            assert(strk_reserves > 0, 'Insufficient STRK reserves');
            assert(token_reserves > 0, 'Insufficient token reserves');

            let strk_output = self.price(token_input, token_reserves, strk_reserves);

            assert(strk_output > 0, 'STRK output must be non-zero');

            self.token.read().transfer_from(caller, contract_address, token_input);
            self.strk_token.read().transfer(caller, strk_output);

            self.emit(Event::TokenToStrkSwap(TokenToStrkSwap {
                swapper: caller,
                tokens_input: token_input,
                strk_output,
            }));

            strk_output
        }

        // Todo Checkpoint 5:  Implement your function deposit here.
        /// Deposits STRK and tokens into the liquidity pool.
        ///
        /// Args:
        ///     self: The contract state.
        ///     strk_amount: The amount of STRK to deposit.
        ///
        /// Returns:
        ///     u256: The amount of liquidity minted.
        fn deposit(ref self: ContractState, strk_amount: u256) -> u256 {
            let caller = get_caller_address();
            let contract_address = get_contract_address();

            let strk_reserves = self.strk_token.read().balance_of(contract_address);
            let _token_reserves = self.token.read().balance_of(contract_address);
            let total_liquidity = self.total_liquidity.read();

            assert(strk_amount > 0, 'STRK amount must be non-zero');

            let token_amount = self.get_deposit_token_amount(strk_amount);

            assert(token_amount > 0, 'Token amount must be non-zero');

            self.strk_token.read().transfer_from(caller, contract_address, strk_amount);
            self.token.read().transfer_from(caller, contract_address, token_amount);

            let liquidity_minted = if total_liquidity == 0 {
                strk_amount
            } else {
                (strk_amount * total_liquidity) / strk_reserves
            };

            assert(liquidity_minted > 0, 'Liquidity minted must not zero');

            self.total_liquidity.write(total_liquidity + liquidity_minted);
            let current_liquidity = self.liquidity.read(caller);
            self.liquidity.write(caller, current_liquidity + liquidity_minted);

            self.emit(Event::LiquidityProvided(LiquidityProvided {
                liquidity_provider: caller,
                liquidity_minted,
                strk_input: strk_amount,
                tokens_input: token_amount,
            }));

            liquidity_minted
        }

        // Todo Checkpoint 5:  Implement your function get_deposit_token_amount here.
        /// get deposit token amount when deposit strk_amount STRK.
        ///
        /// Args:
        ///     self: The contract state.
        ///     strk_amount: The amount of STRK to deposit.
        ///
        /// Returns:
        ///     u256: The token_amount of deposit.
        fn get_deposit_token_amount(self: @ContractState, strk_amount: u256) -> u256 {
            let contract_address = get_contract_address();
            let strk_reserves = self.strk_token.read().balance_of(contract_address);
            let _token_reserves = self.token.read().balance_of(contract_address);

            if strk_reserves == 0 {
                return 0;
            }

            (strk_amount * _token_reserves) / strk_reserves
        }

        // Todo Checkpoint 5:  Implement your function withdraw here.
        /// Withdraws STRK and tokens from the liquidity pool.
        ///
        /// Args:
        ///     self: The contract state.
        ///     amount: The amount of liquidity to withdraw.
        ///
        /// Returns:
        ///     (u256, u256): The amounts of STRK and tokens withdrawn.
        fn withdraw(ref self: ContractState, amount: u256) -> (u256, u256) {
            let caller = get_caller_address();
            let contract_address = get_contract_address();

            let strk_reserves = self.strk_token.read().balance_of(contract_address);
            let token_reserves = self.token.read().balance_of(contract_address);
            let total_liquidity = self.total_liquidity.read();
            let user_liquidity = self.liquidity.read(caller);

            assert(amount > 0, 'Amount must be non-zero');
            assert(amount <= user_liquidity, 'Insufficient liquidity');
            assert(total_liquidity > 0, 'No liquidity in pool');

            let strk_amount = (amount * strk_reserves) / total_liquidity;
            let token_amount = (amount * token_reserves) / total_liquidity;

            assert(strk_amount > 0, 'STRK amount must be non-zero');
            assert(token_amount > 0, 'Token amount must be non-zero');

            self.liquidity.write(caller, user_liquidity - amount);
            self.total_liquidity.write(total_liquidity - amount);

            self.strk_token.read().transfer(caller, strk_amount);
            self.token.read().transfer(caller, token_amount);

            self.emit(Event::LiquidityRemoved(LiquidityRemoved {
                liquidity_remover: caller,
                liquidity_withdrawn: amount,
                tokens_output: token_amount,
                strk_output: strk_amount,
            }));

            (strk_amount, token_amount)
        }
    }
}
